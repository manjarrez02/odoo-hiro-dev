odoo.define('pos_all_in_one.PaymentScreen', function(require) {
	'use strict';

	const PaymentScreen = require('point_of_sale.PaymentScreen');
	const Registries = require('point_of_sale.Registries');
	const session = require('web.session');

	const BiPaymentScreen = PaymentScreen => 
		class extends PaymentScreen {
			setup() {
				super.setup();
			}

			async selectPartner() {
				let self = this;
				if (this.currentOrder.is_paying_partial){
					return self.showPopup('ErrorPopup', {
						title: self.env._t('Not Allowed'),
						body: self.env._t('You cannot change customer of draft order.'),
					});
				} else {
					super.selectPartner();
				}
			}

			remove_current_orderlines(){
				let self = this;
				let order = self.env.pos.get_order();
				let orderlines = order.get_orderlines();
				order.set_partner(null);           
				if (orderlines.length > 0) {
					orderlines.forEach(function (line) {
						order.remove_orderline(line);
					});
				}
				order.is_paying_partial=false
			}

			async click_back(){
				let self = this;
				if(this.currentOrder.is_paying_partial){
					const { confirmed } = await this.showPopup('ConfirmPopup', {
						title: self.env._t('Cancel Payment ?'),
						body: self.env._t('Are you sure,You want to Cancel this payment?'),
					});
					if (confirmed) {
						var order = self.env.pos.get_order()
						self.remove_current_orderlines();
						// self.env.pos.removeOrder(order);
						self.showScreen('ProductScreen');
					}
				}
				else{
					self.showScreen('ProductScreen');
				}
			}

			// async check_credit_validation(){
			// 	let self = this;
			// 	let currentOrder = this.env.pos.get_order();
			// 	let orderlines = currentOrder.get_orderlines();					
			// 	let plines = currentOrder.get_paymentlines();
			// 	let dued = currentOrder.get_due();
			// 	let changed = currentOrder.get_change();
			// 	let client = currentOrder.get_partner();
			// 	let flag = 0;
			// 	let call_super = true;

			// 	if(orderlines.length === 0){
			// 		call_super = false;
			// 		return self.showPopup('ErrorPopup',{
			// 			'title': this.env._t('Empty Order'),
			// 			'body': this.env._t('There must be at least one product in your order before it can be validated.'),
			// 		});
			// 	}

			// 	if(client){
			// 		for (let i = 0; i < plines.length; i++) {
			// 			await self.rpc({
			// 				model: 'pos.order',
			// 				method: 'check_change_credit',
			// 				args: [currentOrder.partner.id ,plines[i].amount, plines[i].payment_method.id,currentOrder.pos_session_id],
			// 			}).then(async function(output) {
			// 				let limit_amount = client.bi_total_credit_amount + output
			// 				if(client.allow_over_limit == true){
			// 					if(currentOrder.get_change() > 0){ // Make Condition that pay exact amount, You cannot Pay More than Total Amount
			// 						call_super = false;
			// 						return self.showPopup('ErrorPopup',{
			// 							'title': self.env._t('Payment Amount Exceeded'),
			// 							'body': self.env._t('You cannot Pay More than Total Amount'),
			// 						});
			// 					}
			// 					else if(limit_amount > client.limit_credit){
			// 						call_super = false;
			// 						const { confirmed } = await self.showPopup('BiErrorPopup',{
			// 							'title': self.env._t('Not Allow Credit Payment'),
			// 							'body': self.env._t('Maximum Credit Limit for this customer reached.'),
			// 						});
			// 						if (confirmed) {
			// 				        	const { confirmed, payload: inputPin } = await self.showPopup('NumberPopup', {
			// 				                isPassword: true,
			// 				                title: self.env._t('Password ?'),
			// 				                startingValue: null,
			// 				            });

			// 				            if (!confirmed) return;

			// 				            if (self.env.pos.user.add_pin === inputPin) {
			// 				            	self.rpc({
			// 									model: 'res.partner',
			// 									method: 'update_partner_credit',
			// 									args: [client.id, output],
			// 								});
			// 				            	call_super = true;
			// 				            } else {
			// 				                await self.showPopup('ErrorPopup', {
			// 				                	'title': self.env._t('Incorrect Password'),
			// 									'body': self.env._t('Wrong Pin'),
			// 				                });
			// 				                return;
			// 				            }
			// 						}
			// 						return true;
			// 					}
			// 					else{
			// 						self.rpc({
			// 							model: 'res.partner',
			// 							method: 'update_partner_credit',
			// 							args: [client.id, output],
			// 						});
			// 						return true;
			// 					}
			// 				} 
			// 			});
			// 		}
			// 	}
			// 	return call_super;
			// }

			// async validateOrder(isForceValidate) {
			// 	let check = await this.check_credit_validation();
			// 	if (check){
			// 		super.validateOrder(isForceValidate);
			// 	}
			// }


			async check_partical_payment(){
				let self = this;
				let currentOrder = this.env.pos.get_order();
				let orderlines = currentOrder.get_orderlines();					
				let plines = currentOrder.get_paymentlines();
				let dued = currentOrder.get_due();
				let changed = currentOrder.get_change();
				let client = currentOrder.get_partner();
				let flag = 0;
				let call_super = true;
				let lst = self.env.pos.access_of_users;
				var due_amount = 0;

				if(orderlines.length === 0){
					call_super = false;
					return self.showPopup('ErrorPopup',{
						'title': this.env._t('Empty Order'),
						'body': this.env._t('There must be at least one product in your order before it can be validated.'),
					});
				}

				if(client){
					await this.rpc({
						model: 'account.move',
						method: 'check_due_amount',
						args: [1,currentOrder.get_partner()],
					}).then(function(output){
						due_amount = output
					});	
					if(due_amount > 0){
						call_super = false;
						const { confirmed } = await self.showPopup('BiErrorPopup',{
							'title': self.env._t('Payment Amount Due'),
							'body': self.env._t('The previous payment for this customer is not paid'),
						});
						if (confirmed) {
							const selectionList = lst.map(otype => ({
									id: otype.id,
									label: otype.name,
									isSelected:false,
									item: otype,
								}));

								const { confirmed, payload: selecteduser } = await self.showPopup('SelectionPopup',{
									title: self.env._t('Choose SalesPersons'),
									list: selectionList,
								});

							if (!confirmed) {
								return;
							}
							if (selecteduser) {	
								const { confirmed, payload: inputPin } = await self.showPopup('NumberPopup', {
								    isPassword: true,
								    title: self.env._t('Password ?'),
								    startingValue: null,
								});

								if (!confirmed) return;
								if (confirmed){
									if (selecteduser.add_pin === inputPin) {
										if(currentOrder){
											currentOrder.set_cust_saleper_due_id(selecteduser.id)
										}										
										if(client.allow_over_limit == true){
											var check_limit = client.limit_credit - client.bi_total_credit_amount
											if(changed > 0){
												call_super = false;
												return self.showPopup('ErrorPopup',{
													'title': self.env._t('Payment Amount Exceeded'),
													'body': self.env._t('You cannot Pay More than Total Amount'),
												});
											}
											else if(dued > check_limit){
												call_super = false;
												const { confirmed } = await self.showPopup('BiErrorPopup',{
													'title': self.env._t('Not Allow Credit Payment'),
													'body': self.env._t('Maximum Credit Limit for this customer reached.'),
												});
												if (confirmed) {
													const selectionList = lst.map(otype => ({
															id: otype.id,
															label: otype.name,
															isSelected:false,
															item: otype,
														}));

														const { confirmed, payload: selecteduser } = await self.showPopup('SelectionPopup',{
															title: self.env._t('Choose SalesPersons'),
															list: selectionList,
														});

													if (!confirmed) {
														return;
													}

													if (selecteduser) {	
														const { confirmed, payload: inputPin } = await self.showPopup('NumberPopup', {
														    isPassword: true,
														    title: self.env._t('Password ?'),
														    startingValue: null,
														});

														if (!confirmed) return;

														if (selecteduser.add_pin === inputPin) {
															if(currentOrder){
																currentOrder.set_cust_saleper_limit_id(selecteduser.id)
															}
															self.rpc({
																model: 'res.partner',
																method: 'update_partner_credit',
																args: [client.id, dued],
															});
															call_super = true;
														} else {
														    await self.showPopup('ErrorPopup', {
														    	'title': self.env._t('Incorrect Password'),
																'body': self.env._t('Wrong Pin'),
														    });
														    return;
														}
													}								
												}
											}
											else{
												self.rpc({
													model: 'res.partner',
													method: 'update_partner_credit',
													args: [client.id, dued],
												});
												return true;
											}
										}else{
											call_super = true;
										}
									} else {
									    await self.showPopup('ErrorPopup', {
									    	'title': self.env._t('Incorrect Password'),
											'body': self.env._t('Wrong Pin'),
									    });
									    return;
									}
								}
							}								
						}
					}else{

						if(client.allow_over_limit == true){
							var check_limit = client.limit_credit - client.bi_total_credit_amount

							if(changed > 0){
								call_super = false;
								return self.showPopup('ErrorPopup',{
									'title': self.env._t('Payment Amount Exceeded'),
									'body': self.env._t('You cannot Pay More than Total Amount'),
								});
							}
							else if(dued > check_limit){
								call_super = false;
								const { confirmed } = await self.showPopup('BiErrorPopup',{
									'title': self.env._t('Not Allow Credit Payment'),
									'body': self.env._t('Maximum Credit Limit for this customer reached.'),
								});
								if (confirmed) {
									const selectionList = lst.map(otype => ({
											id: otype.id,
											label: otype.name,
											isSelected:false,
											item: otype,
										}));

										const { confirmed, payload: selecteduser } = await self.showPopup('SelectionPopup',{
											title: self.env._t('Choose SalesPersons'),
											list: selectionList,
										});

									if (!confirmed) {
										return;
									}

									if (selecteduser) {	
										const { confirmed, payload: inputPin } = await self.showPopup('NumberPopup', {
										    isPassword: true,
										    title: self.env._t('Password ?'),
										    startingValue: null,
										});

										if (!confirmed) return;

										if (selecteduser.add_pin === inputPin) {
											if(currentOrder){
												currentOrder.set_cust_saleper_limit_id(selecteduser.id)
											}
											self.rpc({
												model: 'res.partner',
												method: 'update_partner_credit',
												args: [client.id, dued],
											});
											call_super = true;
										} else {
										    await self.showPopup('ErrorPopup', {
										    	'title': self.env._t('Incorrect Password'),
												'body': self.env._t('Wrong Pin'),
										    });
										    return;
										}
									}								
								}
							}
							else{
								self.rpc({
									model: 'res.partner',
									method: 'update_partner_credit',
									args: [client.id, dued],
								});
								return true;
							}
						}
					}
				}else{
					return self.showPopup('ErrorPopup', {
						title: self.env._t('Unknown customer'),
						body: self.env._t('You cannot perform partial payment.Select customer first.'),
					});					
				}
				return call_super;
			}

			async clickPayLater(){
				let self = this;
				let order = self.env.pos.get_order();
				let check = await this.check_partical_payment();
				if(check){
					order.is_partial = true;
					order.amount_due = order.get_due();
					order.set_is_partial(true);
					order.to_invoice = true;
					order.finalized = false;
					self.env.pos.push_single_order(order);
					self.showScreen('ReceiptScreen');						
				}
			}
		}

	Registries.Component.extend(PaymentScreen, BiPaymentScreen);

	return PaymentScreen;

});