# models/account_move.py
from odoo import models, api

class AccountMove(models.Model):
    _inherit = "account.move"

    @api.model
    def _get_line_packaging_info(self, lines):
        """
        lines: recordset de account.move.line
        Retorna: dict {line.id: {'best_pkg': packaging.record or False, 'best_count': float}}

        Regla:
          1) Si existe sale_line_ids con product_packaging_id:
               - Si qty_factura es múltiplo entero de packaging.qty → usar ese empaque.
               - Si no → pasar a (2).
          2) Buscar entre todos los empaques del producto el de mayor qty que divida exacto.
               - Si existe → usarlo.
               - Si no → best_pkg = False, best_count = 0.
        """
        result = {}

        # --- 1. Cargar empaques de todos los productos involucrados ---
        product_ids = lines.mapped("product_id").ids
        pkgs_all = self.env["product.packaging"].search(
            [("product_id", "in", product_ids), ("qty", ">", 0)],
            order="product_id, qty desc",
        )
        pkgs_by_product = {}
        for p in pkgs_all:
            pkgs_by_product.setdefault(p.product_id.id, []).append(p)

        # --- 2. Procesar cada línea de factura ---
        for line in lines:
            prod = line.product_id
            qty_in_product_uom = (
                line.product_uom_id._compute_quantity(line.quantity, prod.uom_id)
                if line.product_uom_id
                else line.quantity
            )

            best_pkg = False
            best_count = 0

            # ---- Paso 1: intentar con empaque de la orden de venta ----
            if line.sale_line_ids:
                for sale_line in line.sale_line_ids:
                    pkg = sale_line.product_packaging_id
                    if not pkg or pkg.qty <= 0:
                        continue

                    ratio = qty_in_product_uom / pkg.qty
                    if abs(ratio - int(ratio)) < 1e-6:
                        # Es múltiplo entero → usar este empaque
                        best_pkg = pkg
                        best_count = int(ratio)
                        break
                # Si ya encontramos un empaque válido desde la orden, no hace falta más
                if best_pkg:
                    result[line.id] = {
                        "best_pkg": best_pkg,
                        "best_count": best_count,
                    }
                    continue

            # ---- Paso 2: fallback a empaques del producto (mayor qty divisible) ----
            for pkg in pkgs_by_product.get(prod.id, []):
                if pkg.qty <= 0:
                    continue
                ratio = qty_in_product_uom / pkg.qty
                if abs(ratio - int(ratio)) < 1e-6:
                    best_pkg = pkg
                    best_count = int(ratio)
                    break

            result[line.id] = {
                "best_pkg": best_pkg,
                "best_count": best_count,
            }

        return result