
from odoo import models


class PosSession(models.Model):
    _inherit = 'pos.session'

    def cancel_unprocessed_orders(self):

        self.ensure_one()
        draft_orders = self.env['pos.order'].search([('state', '=', 'draft'),('session_id.config_id', '=', self.config_id.id)])

        # Cambiar el estado de todas las órdenes a cancelado en un solo paso
        draft_orders.write({'state': 'cancel'})

        for order in draft_orders:
            # Verificar si tiene recolecciones
            for picking in order.picking_ids:
                if picking.state == 'done':
                    # Ejecutar la acción de devolución (ID: 292) para abrir el wizard
                    #action_return = picking.with_context(active_id=picking.id).env['ir.actions.act_window'].browse(292).read()[0]
                    action_return = picking.with_context(active_id=picking.id).env['ir.actions.act_window'].sudo().browse(292).read()[0]

                    
                    # Crear el asistente de devolución
                    return_wizard = self.env['stock.return.picking'].with_context(active_id=picking.id).create({
                        'picking_id': picking.id
                    })

                    # Simular la selección de productos en el asistente
                    return_wizard._onchange_picking_id()

                    # Ejecutar la acción 'create_returns' como se haría al presionar el botón
                    return_data = return_wizard.create_returns()
                    
                    new_picking = self.env['stock.picking'].browse(return_data.get('res_id'))
                    
                    if new_picking and new_picking.exists() and new_picking.state not in ['done', 'cancel']:
                        immediate_transfer_line_ids = []
                        for picking in new_picking:
                            immediate_transfer_line_ids.append([0, False, {
                                'picking_id': picking.id,
                                'to_immediate': True
                            }])
                        
                        res = self.env['stock.immediate.transfer'].create({
                            'pick_ids': [(4, p.id) for p in new_picking],
                            'show_transfers': False,
                            'immediate_transfer_line_ids': immediate_transfer_line_ids
                        })
                        
                        res.with_context(button_validate_picking_ids=res.pick_ids.ids).process()