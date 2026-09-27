odoo.define('loyalty_bundle_pricing.Loyalty', function (require) {
    "use strict";

    const { PosGlobalState, Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    const PosLoyaltyBundlePricingGlobalState = (PosGlobalState) => class PosLoyaltyBundlePricingGlobalState extends PosGlobalState {
        async _processData(loadedData) {
            await super._processData(...arguments);
            await this._hydrateLoyaltyBundleRewards();
        }

        async _hydrateLoyaltyBundleRewards() {
            try {
                const rewardIds = (this.rewards || []).map(r => r.id);
                if (rewardIds.length > 0 && this.env && this.env.services && this.env.services.rpc) {
                    const safeFields = [
                        'id', 'discount_mode', 'bundle_qty', 'bundle_price',
                        'bundle_pricing_mode', 'free_qty',
                        'discount', 'discount_applicability',
                        'discount_product_ids'
                    ];
                    const customData = await this.env.services.rpc({
                        model: 'loyalty.reward',
                        method: 'search_read',
                        args: [[['id', 'in', rewardIds]], safeFields],
                    });
                    if (Array.isArray(customData)) {
                        for (const item of customData) {
                            const r = (this.reward_by_id && this.reward_by_id[item.id]) || (this.rewards && this.rewards.find(x => x.id === item.id));
                            if (r) {
                                // Merge custom fields and sync discount_product_ids
                                r.discount_mode = item.discount_mode;
                                r.bundle_qty = item.bundle_qty;
                                r.bundle_price = item.bundle_price;
                                r.bundle_pricing_mode = item.bundle_pricing_mode;
                                r.free_qty = item.free_qty;
                                r.discount = item.discount;
                                r.discount_applicability = item.discount_applicability;
                                if (Array.isArray(item.discount_product_ids)) {
                                    r.discount_product_ids = item.discount_product_ids;
                                    if (!(r.all_discount_product_ids instanceof Set)) {
                                        r.all_discount_product_ids = new Set();
                                    }
                                    for (const pid of item.discount_product_ids) {
                                        r.all_discount_product_ids.add(pid);
                                    }
                                }
                                r._hydrated = true;
                            }
                        }
                    }
                    // Load trigger_product_ids separately (custom column, may not exist in older DB)
                    try {
                        const triggerData = await this.env.services.rpc({
                            model: 'loyalty.reward',
                            method: 'search_read',
                            args: [[['id', 'in', rewardIds]], ['id', 'trigger_product_ids']],
                        });
                        if (Array.isArray(triggerData)) {
                            for (const item of triggerData) {
                                const r = (this.reward_by_id && this.reward_by_id[item.id]) || (this.rewards && this.rewards.find(x => x.id === item.id));
                                if (r && item.trigger_product_ids) {
                                    r.trigger_product_ids = item.trigger_product_ids;
                                    // Solo en promociones cruzadas se excluyen los detonadores de los productos a bonificar
                                    if (r.bundle_pricing_mode === 'cross_product_free' && r.all_discount_product_ids instanceof Set) {
                                        for (const tid of item.trigger_product_ids) {
                                            r.all_discount_product_ids.delete(tid);
                                        }
                                    }
                                }
                                // Para modalidades de bloque (free_units, target_price, fixed_discount),
                                // si all_discount_product_ids está vacío, heredar los productos de las reglas
                                if (r && r.discount_mode === 'per_block' && r.bundle_pricing_mode !== 'cross_product_free') {
                                    if (!r.all_discount_product_ids || r.all_discount_product_ids.size === 0) {
                                        if (!(r.all_discount_product_ids instanceof Set)) {
                                            r.all_discount_product_ids = new Set();
                                        }
                                        if (r.program_id && r.program_id.rules) {
                                            for (const rule of r.program_id.rules) {
                                                if (rule.valid_product_ids) {
                                                    for (const pid of rule.valid_product_ids) {
                                                        r.all_discount_product_ids.add(pid);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // trigger_product_ids column may not exist in DB yet; fallback will use rule products
                    }
                }
            } catch (err) {
                console.warn("[LoyaltyBundlePricing] Error hidratando recompensas por RPC:", err);
            }
        }

        _loadLoyaltyData() {
            super._loadLoyaltyData(...arguments);
            // Blindar this.reward_by_id con un Proxy para evitar que cualquier reward_id inexistente lance TypeError
            if (this.reward_by_id && !this.reward_by_id._is_proxied) {
                const targetObj = this.reward_by_id;
                this.reward_by_id = new Proxy(targetObj, {
                    get(target, prop) {
                        if (prop === '_is_proxied') return true;
                        if (prop in target) {
                            return target[prop];
                        }
                        // Fallback seguro si se accede a una recompensa huerfana eliminada o inactiva
                        if (typeof prop === 'string' && !isNaN(Number(prop))) {
                            return {
                                id: Number(prop),
                                reward_type: false,
                                is_global_discount: false,
                                program_id: false,
                                all_discount_product_ids: new Set(),
                            };
                        }
                        return target[prop];
                    }
                });
            }
        }
    };

    const PosLoyaltyBundlePricingOrder = (Order) => class PosLoyaltyBundlePricingOrder extends Order {
        init_from_JSON(json) {
            super.init_from_JSON(...arguments);
            this._purgeOrphanRewardLines();
            this.cleanInvalidRewardLinesSync();
        }

        add_product(product, options) {
            if (this.finalized || this._printed) {
                this.pos.removeOrder(this);
                return this.pos.add_new_order().add_product(product, options);
            }
            this.cleanInvalidRewardLinesSync();
            const res = super.add_product(...arguments);
            this.cleanInvalidRewardLinesSync();
            return res;
        }

        async _couponForProgram(program) {
            const isBundleOrCurrent = program && (
                program.applies_on === 'current' ||
                (program.rewards || []).some(r => r.discount_mode === 'per_block' || this._isCrossProductFree(r))
            );
            if (isBundleOrCurrent && program.is_nominative) {
                // Pass shallow clone with is_nominative=false so we never mutate the global reactive program
                return await super._couponForProgram(Object.assign({}, program, { is_nominative: false }));
            }
            return super._couponForProgram(...arguments);
        }

        _getRealCouponPoints(coupon_id) {
            const pe = Object.values(this.couponPointChanges || {}).find(p => p && p.coupon_id === coupon_id);
            const program = pe && this.pos && this.pos.program_by_id && this.pos.program_by_id[pe.program_id];
            const isBundleOrCurrent = program && (
                program.applies_on === 'current' ||
                (program.rewards || []).some(r => r.discount_mode === 'per_block' || this._isCrossProductFree(r))
            );
            if (isBundleOrCurrent) {
                let points = (pe && program.applies_on !== 'future') ? pe.points : 0;
                for (const line of this.get_orderlines()) {
                    if (line.is_reward_line && line.coupon_id === coupon_id) {
                        points -= line.points_cost;
                    }
                }
                return points;
            }
            return super._getRealCouponPoints(...arguments);
        }

        _purgeOrphanRewardLines() {
            if (!this.orderlines) return;

            const allRewardLines = this.get_orderlines().filter(l => l.is_reward_line);
            if (allRewardLines.length === 0) {
                return;
            }

            // Si el carrito no contiene productos normales (carrito vacío),
            // ninguna recompensa promocional es válida. Limpieza total inmediata.
            const regularLines = this.get_orderlines().filter(l => !l.is_reward_line && !l.refunded_orderline_id);
            if (regularLines.length === 0) {
                for (const line of allRewardLines) {
                    this.orderlines.remove(line);
                }
                if (this.couponPointChanges && Object.keys(this.couponPointChanges).length > 0) {
                    this.couponPointChanges = {};
                }
                return;
            }

            // 1. Eliminar líneas huérfanas sin recompensa válida en el sistema
            const orphanLines = allRewardLines.filter(line => {
                if (!line.reward_id) return true;
                const r = this.pos && this.pos.reward_by_id && this.pos.reward_by_id[line.reward_id];
                return !r || !r.reward_type;
            });
            for (const line of orphanLines) {
                this.orderlines.remove(line);
            }

            // 2. Deduplicación preventiva universal de recompensas repetidas
            const seenRewardIds = new Set();
            const remainingRewardLines = this.get_orderlines().filter(l => l.is_reward_line && l.reward_id);
            for (const line of remainingRewardLines) {
                if (seenRewardIds.has(line.reward_id)) {
                    this.orderlines.remove(line);
                } else {
                    seenRewardIds.add(line.reward_id);
                }
            }
        }

        /**
         * Determines if a reward is of type "Buy X get Y free (conditioned on adding Y)".
         */
        _isCrossProductFree(reward) {
            if (!reward) return false;
            // Verificación primaria: flag explícito de la modalidad
            if (reward.bundle_pricing_mode === 'cross_product_free') return true;
            // Exclusión estricta: ninguna otra modalidad de bloque es cross_product_free
            if (['target_price', 'free_units', 'fixed_discount'].includes(reward.bundle_pricing_mode)) {
                return false;
            }
            // Heurística de respaldo exclusiva para registros antiguos con bundle_pricing_mode nulo
            if (reward.discount_mode === 'per_block' && !reward.bundle_pricing_mode) {
                const desc = (reward.description || '').toLowerCase();
                if (desc.includes('gratis') && (desc.includes('compra') || desc.includes('lleva') || desc.includes('recibe')) && !desc.includes('uds') && !desc.includes('x')) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Computes the cross-product-free promotion context for a given reward.
         *
         * Key invariants:
         *   - Y products come from reward.discount_product_ids and reward.all_discount_product_ids.
         *   - X products come from reward.trigger_product_ids or program rules.
         *   - X and Y are strictly disjoint: X product IDs are removed from Y set and vice versa.
         *   - If Y is not present in the cart, effectiveFreeUnits = 0 (promotion requires Y to be added).
         */
        _getCrossProductFreeContext(reward) {
            const ruleMinQty = (reward.program_id && reward.program_id.rules && reward.program_id.rules[0] && reward.program_id.rules[0].minimum_qty) || 1;
            const bundleQty = reward.bundle_qty || ruleMinQty || 1;
            const freeQtyPerBlock = reward.free_qty || 1;

            // 1. Identify X products (trigger / detonator)
            // Primary: Products from the program's conditional rules ("Reglas Condicionales")
            const triggerProductIds = new Set();
            if (reward.program_id && reward.program_id.rules) {
                for (const rule of reward.program_id.rules) {
                    if (rule.valid_product_ids) {
                        for (const id of rule.valid_product_ids) {
                            if (typeof id === 'number') triggerProductIds.add(id);
                        }
                    }
                }
            }
            // Also include explicit trigger_product_ids if defined
            if (Array.isArray(reward.trigger_product_ids)) {
                for (const id of reward.trigger_product_ids) {
                    if (typeof id === 'number') triggerProductIds.add(id);
                }
            }

            // 2. Identify Y products (gift / reward)
            // Primary: reward.discount_product_ids (the products selected in "Recompensas")
            const rewardProductIds = new Set();
            if (Array.isArray(reward.discount_product_ids)) {
                for (const id of reward.discount_product_ids) {
                    if (typeof id === 'number') rewardProductIds.add(id);
                }
            }
            if (reward.all_discount_product_ids instanceof Set) {
                for (const id of reward.all_discount_product_ids) {
                    if (typeof id === 'number') rewardProductIds.add(id);
                }
            } else if (Array.isArray(reward.all_discount_product_ids)) {
                for (const id of reward.all_discount_product_ids) {
                    if (typeof id === 'number') rewardProductIds.add(id);
                }
            }

            // 3. Enforce strict disjointness: X can never be Y, Y can never be X
            // Detonator products (X) take precedence: remove all X from Y
            for (const tid of triggerProductIds) {
                rewardProductIds.delete(tid);
            }

            // 4. Both sets must be non-empty to proceed
            if (rewardProductIds.size === 0 || triggerProductIds.size === 0) {
                return {
                    rewardProductIds, triggerProductIds,
                    matchingRewardLines: [], matchingTriggerLines: [],
                    totalTriggerQty: 0, completeBlocks: 0,
                    maxFreeUnits: 0, totalRewardQty: 0, effectiveFreeUnits: 0,
                };
            }

            // 5. Find matching cart lines (non-reward lines with positive qty)
            const cartLines = this.get_orderlines().filter(
                line => !line.is_reward_line && line.get_quantity() > 0
            );
            const matchingTriggerLines = cartLines.filter(
                line => triggerProductIds.has(line.get_product().id)
            );
            const matchingRewardLines = cartLines.filter(
                line => rewardProductIds.has(line.get_product().id)
            );

            // 6. Promotion is conditioned on BOTH X and Y being in the cart
            if (matchingRewardLines.length === 0 || matchingTriggerLines.length === 0) {
                return {
                    rewardProductIds, triggerProductIds,
                    matchingRewardLines, matchingTriggerLines,
                    totalTriggerQty: matchingTriggerLines.reduce((sum, line) => sum + line.get_quantity(), 0),
                    completeBlocks: 0,
                    maxFreeUnits: 0,
                    totalRewardQty: matchingRewardLines.reduce((sum, line) => sum + line.get_quantity(), 0),
                    effectiveFreeUnits: 0,
                };
            }

            const totalTriggerQty = matchingTriggerLines.reduce((sum, line) => sum + line.get_quantity(), 0);
            const completeBlocks = Math.floor(totalTriggerQty / bundleQty);
            const maxFreeUnits = completeBlocks * freeQtyPerBlock;
            const totalRewardQty = matchingRewardLines.reduce((sum, line) => sum + line.get_quantity(), 0);
            const effectiveFreeUnits = Math.min(totalRewardQty, maxFreeUnits);

            return {
                rewardProductIds, triggerProductIds,
                matchingRewardLines, matchingTriggerLines,
                totalTriggerQty, completeBlocks,
                maxFreeUnits, totalRewardQty, effectiveFreeUnits,
            };
        }

        pointsForPrograms(programs) {
            const res = super.pointsForPrograms(...arguments);
            for (const program of (programs || [])) {
                if (!program) continue;
                const crossReward = (program.rewards || []).find(r => this._isCrossProductFree(r));
                if (crossReward) {
                    const ctx = this._getCrossProductFreeContext(crossReward);
                    if (ctx.effectiveFreeUnits > 0) {
                        const neededPoints = crossReward.required_points || 1;
                        // Para promociones cruzadas (compra X lleva Y gratis), el descuento se aplica
                        // en una única línea consolidada para todas las unidades gratuitas de Y.
                        res[program.id] = [{ points: neededPoints }];
                    } else {
                        res[program.id] = [];
                    }
                }
                const targetReward = (program.rewards || []).find(r => r.discount_mode === 'per_block' && r.bundle_pricing_mode === 'target_price');
                if (targetReward && targetReward.bundle_price > 0) {
                    const bundleQty = targetReward.bundle_qty || 3;
                    const qualifyingProductIds = (targetReward.all_discount_product_ids && targetReward.all_discount_product_ids.size > 0)
                        ? targetReward.all_discount_product_ids
                        : new Set(program.rules.flatMap(r => [...(r.valid_product_ids || [])]));
                    const matchingLines = this.get_orderlines().filter(line =>
                        !line.is_reward_line && line.get_quantity() > 0 &&
                        (qualifyingProductIds.size === 0 || qualifyingProductIds.has(line.get_product().id))
                    );
                    const totalQty = matchingLines.reduce((sum, line) => sum + line.get_quantity(), 0);
                    const completeBlocks = Math.floor(totalQty / bundleQty);
                    if (completeBlocks > 0) {
                        const promoUnitsNeeded = completeBlocks * bundleQty;
                        let currentCost = 0;
                        let accumQty = 0;
                        const sortedLines = [...matchingLines].sort((a, b) => {
                            const priceA = a.get_quantity() > 0 ? (a.get_base_price() / a.get_quantity()) : (a.get_unit_price() * (1 - (a.get_discount() || 0) / 100));
                            const priceB = b.get_quantity() > 0 ? (b.get_base_price() / b.get_quantity()) : (b.get_unit_price() * (1 - (b.get_discount() || 0) / 100));
                            return priceB - priceA;
                        });
                        for (const line of sortedLines) {
                            const take = Math.min(line.get_quantity(), promoUnitsNeeded - accumQty);
                            const netUnitPrice = line.get_quantity() > 0 ? (line.get_base_price() / line.get_quantity()) : (line.get_unit_price() * (1 - (line.get_discount() || 0) / 100));
                            currentCost += netUnitPrice * take;
                            accumQty += take;
                            if (accumQty >= promoUnitsNeeded) break;
                        }
                        const targetCost = completeBlocks * targetReward.bundle_price;
                        if (currentCost <= targetCost) {
                            // El cliente ya tiene un precio con descuento igual o menor al tope dinámico; no aplica promoción
                            res[program.id] = [];
                        } else {
                            const neededPoints = targetReward.required_points || 1;
                            res[program.id] = [{ points: neededPoints }];
                        }
                    } else {
                        res[program.id] = [];
                    }
                }
                const otherBlockReward = (program.rewards || []).find(r => r.discount_mode === 'per_block' && ['free_units', 'fixed_discount'].includes(r.bundle_pricing_mode));
                if (otherBlockReward) {
                    const bundleQty = otherBlockReward.bundle_qty || 3;
                    const qualifyingProductIds = (otherBlockReward.all_discount_product_ids && otherBlockReward.all_discount_product_ids.size > 0)
                        ? otherBlockReward.all_discount_product_ids
                        : new Set(program.rules.flatMap(r => [...(r.valid_product_ids || [])]));
                    const matchingLines = this.get_orderlines().filter(line =>
                        !line.is_reward_line && line.get_quantity() > 0 &&
                        (qualifyingProductIds.size === 0 || qualifyingProductIds.has(line.get_product().id))
                    );
                    const totalQty = matchingLines.reduce((sum, line) => sum + line.get_quantity(), 0);
                    const completeBlocks = Math.floor(totalQty / bundleQty);
                    if (completeBlocks > 0) {
                        const neededPoints = otherBlockReward.required_points || 1;
                        res[program.id] = [{ points: neededPoints }];
                    } else {
                        res[program.id] = [];
                    }
                }
            }
            return res;
        }

        remove_orderline(line) {
            const isReward = line && line.is_reward_line;
            super.remove_orderline(...arguments);
            if (!isReward) {
                this.cleanInvalidRewardLinesSync();
                this._updateRewards();
            }
            if (this.pos && this.pos.config && this.pos.config.customer_display && typeof this.mirror_image_data === 'function') {
                this.mirror_image_data();
            }
        }

        cleanInvalidRewardLinesSync() {
            if (!this.pos || !this.pos.programs || this.pos.programs.length === 0) {
                return;
            }
            const rewardLines = this.get_orderlines().filter(line => line.is_reward_line);
            if (rewardLines.length === 0) {
                return;
            }
            let removedAny = false;
            this._purgeOrphanRewardLines();
            for (const line of rewardLines) {
                const reward = this.pos.reward_by_id[line.reward_id];
                if (!reward) {
                    this.orderlines.remove(line);
                    removedAny = true;
                    continue;
                }
                if (this._isCrossProductFree(reward)) {
                    const ctx = this._getCrossProductFreeContext(reward);
                    if (ctx.effectiveFreeUnits <= 0) {
                        this.orderlines.remove(line);
                        removedAny = true;
                        if (this.couponPointChanges && this.couponPointChanges[line.coupon_id]) {
                            delete this.couponPointChanges[line.coupon_id];
                        }
                    }
                } else if (reward.discount_mode === 'per_block') {
                    let bundleQty = reward.bundle_qty;
                    if (!bundleQty) {
                        const m = (reward.description || '').match(/(\d+)\s*uds|(\d+)x(\d+)/i);
                        bundleQty = m ? (parseInt(m[1] || m[2]) || 3) : 3;
                    }
                    const qualifyingProductIds = (reward.all_discount_product_ids && reward.all_discount_product_ids.size > 0)
                        ? reward.all_discount_product_ids
                        : new Set(reward.program_id.rules.flatMap(r => [...(r.valid_product_ids || [])]));
                    const matchingLines = this.get_orderlines().filter(l =>
                        !l.is_reward_line && l.get_quantity() > 0 &&
                        (qualifyingProductIds.size === 0 || qualifyingProductIds.has(l.get_product().id))
                    );
                    const totalQty = matchingLines.reduce((sum, l) => sum + l.get_quantity(), 0);
                    const completeBlocks = Math.floor(totalQty / bundleQty);
                    let shouldRemove = completeBlocks <= 0;

                    if (!shouldRemove && reward.bundle_pricing_mode === 'target_price' && reward.bundle_price > 0) {
                        const promoUnitsNeeded = completeBlocks * bundleQty;
                        let currentCost = 0;
                        let accumQty = 0;
                        const sortedLines = [...matchingLines].sort((a, b) => {
                            const priceA = a.get_quantity() > 0 ? (a.get_base_price() / a.get_quantity()) : (a.get_unit_price() * (1 - (a.get_discount() || 0) / 100));
                            const priceB = b.get_quantity() > 0 ? (b.get_base_price() / b.get_quantity()) : (b.get_unit_price() * (1 - (b.get_discount() || 0) / 100));
                            return priceB - priceA;
                        });
                        for (const l of sortedLines) {
                            const take = Math.min(l.get_quantity(), promoUnitsNeeded - accumQty);
                            const netUnitPrice = l.get_quantity() > 0 ? (l.get_base_price() / l.get_quantity()) : (l.get_unit_price() * (1 - (l.get_discount() || 0) / 100));
                            currentCost += netUnitPrice * take;
                            accumQty += take;
                            if (accumQty >= promoUnitsNeeded) break;
                        }
                        const targetCost = completeBlocks * reward.bundle_price;
                        if (currentCost <= targetCost) {
                            shouldRemove = true;
                        }
                    }

                    if (shouldRemove) {
                        this.orderlines.remove(line);
                        removedAny = true;
                        if (this.couponPointChanges && this.couponPointChanges[line.coupon_id]) {
                            delete this.couponPointChanges[line.coupon_id];
                        }
                    }
                }
            }
            if (removedAny && this.pos && this.pos.config && this.pos.config.customer_display && typeof this.mirror_image_data === 'function') {
                this.mirror_image_data();
            }
        }

        _getRewardLineValues(args) {
            const reward = args['reward'];
            if (reward && this._isCrossProductFree(reward)) {
                return this._getRewardLineValuesDiscount(args);
            }
            return super._getRewardLineValues(...arguments);
        }

        _getDiscountableOnCheapest(reward) {
            if (this._isCrossProductFree(reward)) {
                const ctx = this._getCrossProductFreeContext(reward);
                if (ctx.matchingRewardLines.length > 0 && ctx.effectiveFreeUnits > 0) {
                    const sortedLines = [...ctx.matchingRewardLines].sort((a, b) => b.get_unit_price() - a.get_unit_price());
                    let discountAmt = 0;
                    let accum = 0;
                    for (const line of sortedLines) {
                        if (accum >= ctx.effectiveFreeUnits) break;
                        const take = Math.min(line.get_quantity(), ctx.effectiveFreeUnits - accum);
                        const unitPrice = line.get_quantity() > 0 ? (line.get_base_price() / line.get_quantity()) : line.get_unit_price();
                        discountAmt += unitPrice * take;
                        accum += take;
                    }
                    const taxKey = sortedLines[0].get_taxes().map(t => t.id).join(',');
                    return {
                        discountable: discountAmt,
                        discountablePerTax: { [taxKey]: discountAmt },
                    };
                }
                return { discountable: 0, discountablePerTax: {} };
            }
            return super._getDiscountableOnCheapest(...arguments);
        }

        _getDiscountableOnSpecific(reward) {
            if (this._isCrossProductFree(reward)) {
                const ctx = this._getCrossProductFreeContext(reward);
                if (ctx.matchingRewardLines.length > 0 && ctx.effectiveFreeUnits > 0) {
                    const sortedLines = [...ctx.matchingRewardLines].sort((a, b) => b.get_unit_price() - a.get_unit_price());
                    let discountAmt = 0;
                    let accum = 0;
                    const discountablePerTax = {};
                    for (const line of sortedLines) {
                        if (accum >= ctx.effectiveFreeUnits) break;
                        const take = Math.min(line.get_quantity(), ctx.effectiveFreeUnits - accum);
                        const unitPrice = line.get_quantity() > 0 ? (line.get_base_price() / line.get_quantity()) : line.get_unit_price();
                        const amount = unitPrice * take;
                        discountAmt += amount;
                        accum += take;
                        const taxKey = line.get_taxes().map(t => t.id).join(',');
                        discountablePerTax[taxKey] = (discountablePerTax[taxKey] || 0) + amount;
                    }
                    return {
                        discountable: discountAmt,
                        discountablePerTax,
                    };
                }
                return { discountable: 0, discountablePerTax: {} };
            }
            return super._getDiscountableOnSpecific(...arguments);
        }

        _getRewardLineValuesDiscount(args) {
            const reward = args['reward'];
            if (!reward) {
                return super._getRewardLineValuesDiscount(...arguments);
            }
            const program = reward.program_id;

            // 1. Pricelist restriction
            if (program && program.pricelist_ids && program.pricelist_ids.length > 0) {
                const currentPricelistId = this.pricelist ? this.pricelist.id : false;
                if (!program.pricelist_ids.includes(currentPricelistId)) {
                    return [];
                }
            }

            // 2. Exclusivity check
            const existingRewardLines = this.get_orderlines().filter(l => l.is_reward_line && l.reward_id !== reward.id);
            const existingDiscountRewards = existingRewardLines.map(l => this.pos.reward_by_id[l.reward_id]).filter(r => r && r.reward_type === 'discount');

            if (program && program.is_exclusive) {
                if (existingDiscountRewards.length > 0) {
                    if (reward.discount_applicability === 'order') {
                        return [];
                    }
                    const rewardProductIds = reward.all_discount_product_ids || new Set();
                    const hasConflict = existingDiscountRewards.some(exR => {
                        if (exR.discount_applicability === 'order') return true;
                        const exProds = exR.all_discount_product_ids || new Set();
                        if (rewardProductIds.size === 0 || exProds.size === 0) return true;
                        for (const id of rewardProductIds) {
                            if (exProds.has(id)) return true;
                        }
                        return false;
                    });
                    if (hasConflict) return [];
                }
            } else if (existingDiscountRewards.some(exR => exR.program_id && exR.program_id.is_exclusive)) {
                const rewardProductIds = reward.all_discount_product_ids || new Set();
                const hasConflict = existingDiscountRewards.filter(exR => exR.program_id && exR.program_id.is_exclusive).some(exR => {
                    if (exR.discount_applicability === 'order' || reward.discount_applicability === 'order') return true;
                    const exProds = exR.all_discount_product_ids || new Set();
                    if (rewardProductIds.size === 0 || exProds.size === 0) return true;
                    for (const id of rewardProductIds) {
                        if (exProds.has(id)) return true;
                    }
                    return false;
                });
                if (hasConflict) return [];
            }

            // 3. Non-bundle rewards: delegate to native
            if (reward.discount_mode !== 'per_block' && !this._isCrossProductFree(reward)) {
                return super._getRewardLineValuesDiscount(...arguments);
            }

            // 4. "Buy X get Y free" (cross_product_free)
            if (this._isCrossProductFree(reward)) {
                const ctx = this._getCrossProductFreeContext(reward);
                if (ctx.effectiveFreeUnits <= 0) {
                    return [];
                }

                // Discount Y units — sorted highest price first
                const sortedYLines = [...ctx.matchingRewardLines].sort((a, b) => b.get_unit_price() - a.get_unit_price());
                const discountProduct = reward.discount_line_product_id ||
                    (ctx.matchingRewardLines[0] && ctx.matchingRewardLines[0].get_product());
                const rewardCode = (Math.random() + 1).toString(36).substring(3);
                const pointCost = reward.required_points || 1;

                let accumFree = 0;
                const discountPerTax = {};
                for (const line of sortedYLines) {
                    if (accumFree >= ctx.effectiveFreeUnits) break;
                    const take = Math.min(line.get_quantity(), ctx.effectiveFreeUnits - accumFree);
                    accumFree += take;
                    const taxKey = line.get_taxes().map(t => t.id).join(',');
                    const unitPrice = line.get_quantity() > 0
                        ? (line.get_base_price() / line.get_quantity())
                        : line.get_unit_price();
                    discountPerTax[taxKey] = (discountPerTax[taxKey] || 0) + (unitPrice * take);
                }

                const result = Object.entries(discountPerTax).reduce((lst, [taxKey, amount]) => {
                    if (!amount) return lst;
                    const taxIds = taxKey === '' ? [] : taxKey.split(',').map(str => parseInt(str));
                    lst.push({
                        product: discountProduct,
                        price: -amount,
                        quantity: 1,
                        reward_id: reward.id,
                        is_reward_line: true,
                        coupon_id: args['coupon_id'],
                        points_cost: 0,
                        reward_identifier_code: rewardCode,
                        tax_ids: taxIds,
                        merge: false,
                    });
                    return lst;
                }, []);

                if (result.length) {
                    result[0]['points_cost'] = pointCost;
                }
                return result;
            }

            // 5. Regular per_block modes (target_price, free_units, fixed_discount)
            // HARD SAFETY GUARD: cross_product_free must NEVER enter regular per_block calculation
            if (this._isCrossProductFree(reward) || reward.bundle_pricing_mode === 'cross_product_free') {
                return [];
            }
            if (!['target_price', 'free_units', 'fixed_discount'].includes(reward.bundle_pricing_mode)) {
                return [];
            }

            let bundleQty = reward.bundle_qty;
            if (!bundleQty) {
                const m = (reward.description || '').match(/(\d+)\s*uds|(\d+)x(\d+)/i);
                bundleQty = m ? (parseInt(m[1] || m[2]) || 3) : 3;
            }
            const qualifyingProductIds = (reward.all_discount_product_ids && reward.all_discount_product_ids.size > 0)
                ? reward.all_discount_product_ids
                : new Set(reward.program_id.rules.flatMap(r => [...(r.valid_product_ids || [])]));
            if (!reward.all_discount_product_ids || reward.all_discount_product_ids.size === 0) {
                reward.all_discount_product_ids = qualifyingProductIds;
            }
            const matchingLines = this.get_orderlines().filter(line =>
                !line.is_reward_line && line.get_quantity() > 0 &&
                (qualifyingProductIds.size === 0 || qualifyingProductIds.has(line.get_product().id))
            );

            const totalQty = matchingLines.reduce((sum, line) => sum + line.get_quantity(), 0);
            const completeBlocks = Math.floor(totalQty / bundleQty);
            if (completeBlocks <= 0) {
                return [];
            }

            let maxDiscount = 0;
            if (reward.bundle_pricing_mode === 'target_price' && reward.bundle_price > 0) {
                const promoUnitsNeeded = completeBlocks * bundleQty;
                let currentCost = 0;
                let accumQty = 0;
                const sortedLines = [...matchingLines].sort((a, b) => {
                    const priceA = a.get_quantity() > 0 ? (a.get_base_price() / a.get_quantity()) : (a.get_unit_price() * (1 - (a.get_discount() || 0) / 100));
                    const priceB = b.get_quantity() > 0 ? (b.get_base_price() / b.get_quantity()) : (b.get_unit_price() * (1 - (b.get_discount() || 0) / 100));
                    return priceB - priceA;
                });
                for (const line of sortedLines) {
                    const take = Math.min(line.get_quantity(), promoUnitsNeeded - accumQty);
                    const netUnitPrice = line.get_quantity() > 0 ? (line.get_base_price() / line.get_quantity()) : (line.get_unit_price() * (1 - (line.get_discount() || 0) / 100));
                    currentCost += netUnitPrice * take;
                    accumQty += take;
                    if (accumQty >= promoUnitsNeeded) {
                        break;
                    }
                }
                const targetCost = completeBlocks * reward.bundle_price;
                maxDiscount = Math.max(0, currentCost - targetCost);
            } else if (reward.bundle_pricing_mode === 'free_units') {
                const freeQtyPerBlock = reward.free_qty || 1;
                const totalFreeUnits = completeBlocks * freeQtyPerBlock;
                let accumFree = 0;
                const sortedLines = [...matchingLines].sort((a, b) => {
                    const priceA = a.get_quantity() > 0 ? (a.get_base_price() / a.get_quantity()) : (a.get_unit_price() * (1 - (a.get_discount() || 0) / 100));
                    const priceB = b.get_quantity() > 0 ? (b.get_base_price() / b.get_quantity()) : (b.get_unit_price() * (1 - (b.get_discount() || 0) / 100));
                    return priceA - priceB;
                });
                for (const line of sortedLines) {
                    const take = Math.min(line.get_quantity(), totalFreeUnits - accumFree);
                    const netUnitPrice = line.get_quantity() > 0 ? (line.get_base_price() / line.get_quantity()) : (line.get_unit_price() * (1 - (line.get_discount() || 0) / 100));
                    maxDiscount += netUnitPrice * take;
                    accumFree += take;
                    if (accumFree >= totalFreeUnits) {
                        break;
                    }
                }
            } else if (reward.bundle_pricing_mode === 'fixed_discount') {
                maxDiscount = completeBlocks * (reward.discount || 0);
            } else {
                return [];
            }

            if (maxDiscount <= 0) {
                return [];
            }

            let getDiscountable;
            if (reward.discount_applicability === 'order') {
                getDiscountable = this._getDiscountableOnOrder.bind(this);
            } else if (reward.discount_applicability === 'cheapest') {
                getDiscountable = this._getDiscountableOnCheapest.bind(this);
            } else if (reward.discount_applicability === 'specific') {
                getDiscountable = this._getDiscountableOnSpecific.bind(this);
            }
            if (!getDiscountable) {
                return [];
            }

            let { discountable, discountablePerTax } = getDiscountable(reward);
            discountable = Math.min(this.get_total_with_tax(), discountable);
            if (!discountable) {
                return [];
            }

            maxDiscount = Math.min(maxDiscount, discountable);
            const discountFactor = discountable ? Math.min(1, maxDiscount / discountable) : 1;
            const discountProduct = reward.discount_line_product_id;
            const rewardCode = (Math.random() + 1).toString(36).substring(3);
            const pointCost = completeBlocks * bundleQty;

            const result = Object.entries(discountablePerTax).reduce((lst, entry) => {
                if (!entry[1]) {
                    return lst;
                }
                const taxIds = entry[0] === '' ? [] : entry[0].split(',').map(str => parseInt(str));
                lst.push({
                    product: discountProduct,
                    price: -(entry[1] * discountFactor),
                    quantity: 1,
                    reward_id: reward.id,
                    is_reward_line: true,
                    coupon_id: args['coupon_id'],
                    points_cost: 0,
                    reward_identifier_code: rewardCode,
                    tax_ids: taxIds,
                    merge: false,
                });
                return lst;
            }, []);

            if (result.length) {
                result[0]['points_cost'] = pointCost;
            }
            return result;
        }

        getClaimableRewards(coupon_id=false, program_id=false, auto=false) {
            const res = super.getClaimableRewards(...arguments);
            const appliedRewardLines = this.get_orderlines().filter(l => l.is_reward_line);
            const appliedRewardIds = new Set(appliedRewardLines.filter(l => l.reward_id).map(l => l.reward_id));
            const appliedDiscountRewards = appliedRewardLines.map(l => this.pos.reward_by_id[l.reward_id]).filter(r => r && r.reward_type === 'discount');
            const exclusiveApplied = appliedDiscountRewards.filter(r => r.program_id && r.program_id.is_exclusive);

            return res.filter(({ reward }) => {
                if (!reward) return true;

                // Si la recompensa por bloque o cruzada ya está aplicada en la orden, no debe volver a reclamarse.
                // La línea existente ya recalcula automáticamente el monto total con las nuevas unidades.
                if ((reward.discount_mode === 'per_block' || this._isCrossProductFree(reward)) && appliedRewardIds.has(reward.id)) {
                    return false;
                }

                if (this._isCrossProductFree(reward)) {
                    const ctx = this._getCrossProductFreeContext(reward);
                    if (ctx.effectiveFreeUnits <= 0) {
                        return false;
                    }
                } else if (reward.discount_mode === 'per_block') {
                    let bundleQty = reward.bundle_qty;
                    if (!bundleQty) {
                        const m = (reward.description || '').match(/(\d+)\s*uds|(\d+)x(\d+)/i);
                        bundleQty = m ? (parseInt(m[1] || m[2]) || 3) : 3;
                    }
                    const qualifyingProductIds = (reward.all_discount_product_ids && reward.all_discount_product_ids.size > 0)
                        ? reward.all_discount_product_ids
                        : new Set(reward.program_id.rules.flatMap(r => [...(r.valid_product_ids || [])]));
                    const matchingLines = this.get_orderlines().filter(l =>
                        !l.is_reward_line && l.get_quantity() > 0 &&
                        (qualifyingProductIds.size === 0 || qualifyingProductIds.has(l.get_product().id))
                    );
                    const totalQty = matchingLines.reduce((sum, l) => sum + l.get_quantity(), 0);
                    const completeBlocks = Math.floor(totalQty / bundleQty);
                    if (completeBlocks <= 0) {
                        return false;
                    }
                    if (reward.bundle_pricing_mode === 'target_price' && reward.bundle_price > 0) {
                        const promoUnitsNeeded = completeBlocks * bundleQty;
                        let currentCost = 0;
                        let accumQty = 0;
                        const sortedLines = [...matchingLines].sort((a, b) => {
                            const priceA = a.get_quantity() > 0 ? (a.get_base_price() / a.get_quantity()) : (a.get_unit_price() * (1 - (a.get_discount() || 0) / 100));
                            const priceB = b.get_quantity() > 0 ? (b.get_base_price() / b.get_quantity()) : (b.get_unit_price() * (1 - (b.get_discount() || 0) / 100));
                            return priceB - priceA;
                        });
                        for (const line of sortedLines) {
                            const take = Math.min(line.get_quantity(), promoUnitsNeeded - accumQty);
                            const netUnitPrice = line.get_quantity() > 0 ? (line.get_base_price() / line.get_quantity()) : (line.get_unit_price() * (1 - (line.get_discount() || 0) / 100));
                            currentCost += netUnitPrice * take;
                            accumQty += take;
                            if (accumQty >= promoUnitsNeeded) break;
                        }
                        const targetCost = completeBlocks * reward.bundle_price;
                        if (currentCost <= targetCost) {
                            return false;
                        }
                    }
                }

                if (reward && reward.reward_type === 'discount') {
                    const rewardProductIds = reward.all_discount_product_ids || new Set();
                    if (exclusiveApplied.length > 0) {
                        const hasConflict = exclusiveApplied.some(exR => {
                            if (exR.discount_applicability === 'order' || reward.discount_applicability === 'order') return true;
                            const exProds = exR.all_discount_product_ids || new Set();
                            if (rewardProductIds.size === 0 || exProds.size === 0) return true;
                            for (const id of rewardProductIds) {
                                if (exProds.has(id)) return true;
                            }
                            return false;
                        });
                        if (hasConflict) return false;
                    }
                    if (reward.program_id && reward.program_id.is_exclusive && appliedDiscountRewards.length > 0) {
                        if (reward.discount_applicability === 'order') return false;
                        const hasConflict = appliedDiscountRewards.some(exR => {
                            if (exR.discount_applicability === 'order') return true;
                            const exProds = exR.all_discount_product_ids || new Set();
                            if (rewardProductIds.size === 0 || exProds.size === 0) return true;
                            for (const id of rewardProductIds) {
                                if (exProds.has(id)) return true;
                            }
                            return false;
                        });
                        if (hasConflict) return false;
                    }
                }

                return true;
            });
        }

        async _updatePrograms() {
            this._purgeOrphanRewardLines();

            if (this.pos && this.pos.reward_by_id) {
                const unhydratedIds = Object.values(this.pos.reward_by_id)
                    .filter(r => r && r.id && !r._hydrated && (r.discount_mode === 'per_block' || !r.bundle_pricing_mode))
                    .map(r => r.id);
                if (unhydratedIds.length > 0 && this.pos.env && this.pos.env.services && this.pos.env.services.rpc) {
                    try {
                        const customData = await this.pos.env.services.rpc({
                            model: 'loyalty.reward',
                            method: 'search_read',
                            args: [[['id', 'in', unhydratedIds]], [
                                'id', 'discount_mode', 'bundle_qty', 'bundle_price',
                                'bundle_pricing_mode', 'free_qty',
                                'discount', 'discount_applicability',
                                'discount_product_ids'
                            ]],
                        });
                        if (Array.isArray(customData)) {
                            for (const item of customData) {
                                const r = this.pos.reward_by_id[item.id];
                                if (r) {
                                    r.discount_mode = item.discount_mode;
                                    r.bundle_qty = item.bundle_qty;
                                    r.bundle_price = item.bundle_price;
                                    r.bundle_pricing_mode = item.bundle_pricing_mode;
                                    r.free_qty = item.free_qty;
                                    r.discount = item.discount;
                                    r.discount_applicability = item.discount_applicability;
                                    if (Array.isArray(item.discount_product_ids)) {
                                        r.discount_product_ids = item.discount_product_ids;
                                        if (!(r.all_discount_product_ids instanceof Set)) {
                                            r.all_discount_product_ids = new Set();
                                        }
                                        for (const pid of item.discount_product_ids) {
                                            r.all_discount_product_ids.add(pid);
                                        }
                                    }
                                    r._hydrated = true;
                                }
                            }
                        }
                        try {
                            const triggerData = await this.pos.env.services.rpc({
                                model: 'loyalty.reward',
                                method: 'search_read',
                                args: [[['id', 'in', unhydratedIds]], ['id', 'trigger_product_ids']],
                            });
                            if (Array.isArray(triggerData)) {
                                for (const item of triggerData) {
                                    const r = this.pos.reward_by_id[item.id];
                                    if (r && item.trigger_product_ids) {
                                        r.trigger_product_ids = item.trigger_product_ids;
                                        if (r.bundle_pricing_mode === 'cross_product_free' && r.all_discount_product_ids instanceof Set) {
                                            for (const tid of item.trigger_product_ids) {
                                                r.all_discount_product_ids.delete(tid);
                                            }
                                        }
                                    }
                                    if (r && r.discount_mode === 'per_block' && r.bundle_pricing_mode !== 'cross_product_free') {
                                        if (!r.all_discount_product_ids || r.all_discount_product_ids.size === 0) {
                                            if (!(r.all_discount_product_ids instanceof Set)) {
                                                r.all_discount_product_ids = new Set();
                                            }
                                            if (r.program_id && r.program_id.rules) {
                                                for (const rule of r.program_id.rules) {
                                                    if (rule.valid_product_ids) {
                                                        for (const pid of rule.valid_product_ids) {
                                                            r.all_discount_product_ids.add(pid);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // trigger_product_ids optional in DB
                        }
                    } catch (e) {
                        console.warn("[LoyaltyBundlePricing] Error en hidratacion bajo demanda:", e);
                    }
                }
            }

            if (this.pos && this.pos.programs) {
                this.pos.programs.sort((a, b) => (a.sequence || 10) - (b.sequence || 10) || a.id - b.id);
            }
            await super._updatePrograms(...arguments);

            if (this.couponPointChanges) {
                for (const [couponId, pe] of Object.entries(this.couponPointChanges)) {
                    const program = this.pos.program_by_id[pe.program_id];
                    if (!program) continue;

                    const isBundleOrCross = (program.rewards || []).some(
                        r => r.discount_mode === 'per_block' || this._isCrossProductFree(r)
                    );
                    if (program.is_nominative && !isBundleOrCross) continue;

                    if (pe.points <= 0) {
                        delete this.couponPointChanges[couponId];
                        continue;
                    }

                    const blockReward = (program.rewards || []).find(r => r.discount_mode === 'per_block' || this._isCrossProductFree(r));
                    if (blockReward) {
                        if (this._isCrossProductFree(blockReward)) {
                            const ctx = this._getCrossProductFreeContext(blockReward);
                            if (ctx.effectiveFreeUnits <= 0) {
                                delete this.couponPointChanges[couponId];
                            }
                        } else {
                            let bundleQty = blockReward.bundle_qty;
                            if (!bundleQty) {
                                const m = (blockReward.description || '').match(/(\d+)\s*uds|(\d+)x(\d+)/i);
                                bundleQty = m ? (parseInt(m[1] || m[2]) || 3) : 3;
                            }
                            const qualifyingProductIds = (blockReward.all_discount_product_ids && blockReward.all_discount_product_ids.size > 0)
                                ? blockReward.all_discount_product_ids
                                : new Set(program.rules.flatMap(r => [...(r.valid_product_ids || [])]));
                            const matchingLines = this.get_orderlines().filter(l =>
                                !l.is_reward_line && l.get_quantity() > 0 &&
                                (qualifyingProductIds.size === 0 || qualifyingProductIds.has(l.get_product().id))
                            );
                            const totalQty = matchingLines.reduce((sum, l) => sum + l.get_quantity(), 0);
                            if (Math.floor(totalQty / bundleQty) <= 0) {
                                delete this.couponPointChanges[couponId];
                            }
                        }
                    }
                }
            }
        }

        _applyReward(reward, coupon_id, args) {
            if (reward && reward.id) {
                // Deduplicación proactiva: eliminar cualquier línea existente de esta recompensa antes de agregar la nueva
                const existingLines = this.get_orderlines().filter(l => l.is_reward_line && l.reward_id === reward.id);
                for (const oldLine of existingLines) {
                    this.orderlines.remove(oldLine);
                }
            }

            if (reward && reward.reward_type === 'discount') {
                const existingRewardLines = this.get_orderlines().filter(l => l.is_reward_line && l.reward_id !== reward.id);
                const existingDiscountRewards = existingRewardLines.map(l => this.pos.reward_by_id[l.reward_id]).filter(r => r && r.reward_type === 'discount');
                const rewardProductIds = reward.all_discount_product_ids || new Set();

                if (reward.program_id && reward.program_id.is_exclusive && existingDiscountRewards.length > 0) {
                    if (reward.discount_applicability === 'order') return false;
                    const hasConflict = existingDiscountRewards.some(exR => {
                        if (exR.discount_applicability === 'order') return true;
                        const exProds = exR.all_discount_product_ids || new Set();
                        if (rewardProductIds.size === 0 || exProds.size === 0) return true;
                        for (const id of rewardProductIds) {
                            if (exProds.has(id)) return true;
                        }
                        return false;
                    });
                    if (hasConflict) return false;
                } else if (existingDiscountRewards.some(exR => exR.program_id && exR.program_id.is_exclusive)) {
                    const hasConflict = existingDiscountRewards.filter(exR => exR.program_id && exR.program_id.is_exclusive).some(exR => {
                        if (exR.discount_applicability === 'order' || reward.discount_applicability === 'order') return true;
                        const exProds = exR.all_discount_product_ids || new Set();
                        if (rewardProductIds.size === 0 || exProds.size === 0) return true;
                        for (const id of rewardProductIds) {
                            if (exProds.has(id)) return true;
                        }
                        return false;
                    });
                    if (hasConflict) return false;
                }
            }

            if (reward && this._isCrossProductFree(reward)) {
                const ctx = this._getCrossProductFreeContext(reward);
                if (ctx.effectiveFreeUnits <= 0) {
                    return false;
                }
            } else if (reward && reward.discount_mode === 'per_block') {
                let bundleQty = reward.bundle_qty;
                if (!bundleQty) {
                    const m = (reward.description || '').match(/(\d+)\s*uds|(\d+)x(\d+)/i);
                    bundleQty = m ? (parseInt(m[1] || m[2]) || 3) : 3;
                }
                const qualifyingProductIds = (reward.all_discount_product_ids && reward.all_discount_product_ids.size > 0)
                    ? reward.all_discount_product_ids
                    : new Set(reward.program_id.rules.flatMap(r => [...(r.valid_product_ids || [])]));
                const matchingLines = this.get_orderlines().filter(line =>
                    !line.is_reward_line && line.get_quantity() > 0 &&
                    (qualifyingProductIds.size === 0 || qualifyingProductIds.has(line.get_product().id))
                );
                const totalQty = matchingLines.reduce((sum, line) => sum + line.get_quantity(), 0);
                if (Math.floor(totalQty / bundleQty) <= 0) {
                    return false;
                }
            }
            const res = super._applyReward(...arguments);
            if (res === true && this.pos && this.pos.config && this.pos.config.customer_display && typeof this.mirror_image_data === 'function') {
                this.mirror_image_data();
            }
            return res;
        }

        _updateRewardLines() {
            const res = super._updateRewardLines ? super._updateRewardLines(...arguments) : undefined;
            if (this.pos && this.pos.config && this.pos.config.customer_display && typeof this.mirror_image_data === 'function') {
                this.mirror_image_data();
            }
            return res;
        }

        async cleanInvalidRewardLines() {
            if (!this.pos || !this.pos.programs || this.pos.programs.length === 0) {
                return;
            }
            this.cleanInvalidRewardLinesSync();
            await this._updateLoyaltyPrograms();

            this.cleanInvalidRewardLinesSync();
            this._updateRewardLines();
            if (this.pos && this.pos.config && this.pos.config.customer_display && typeof this.mirror_image_data === 'function') {
                this.mirror_image_data();
            }
        }
    };

    Registries.Model.extend(PosGlobalState, PosLoyaltyBundlePricingGlobalState);
    Registries.Model.extend(Order, PosLoyaltyBundlePricingOrder);
    return {
        PosLoyaltyBundlePricingGlobalState,
        PosLoyaltyBundlePricingOrder,
    };
});
