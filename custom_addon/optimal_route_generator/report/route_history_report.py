from odoo import api, models, fields


class ReportRouteHistory(models.AbstractModel):
    _name = 'report.optimal_route_generator.route_history_report_document'
    _description = 'Route History Report'

    def _format_duration(self, seconds):
        seconds = int(seconds or 0)
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"

    def _partner_address(self, partner):
        parts = [
            partner.street,
            partner.street2,
            partner.city,
            partner.state_id.name if partner.state_id else False,
            partner.zip,
            partner.country_id.name if partner.country_id else False
        ]
        return ", ".join([p for p in parts if p])

    @api.model
    def _get_report_values(self, docids, data=None):
        docs = self.env['route.history'].browse(docids)
        report_docs = []

        for doc in docs:
            departure_local = ''
            if doc.departure_time:
                departure_local = fields.Datetime.context_timestamp(
                    doc, doc.departure_time
                ).strftime('%Y-%m-%d %H:%M')

            lines = []
            for idx, line in enumerate(
                doc.line_ids.sorted(key=lambda l: (l.sequence, l.id)),
                start=1
            ):
                lines.append({
                    'sequence': chr(ord('A') + idx),
                    'partner_name': line.partner_id.display_name,
                    'city': line.partner_id.city or '',
                    'neighborhood_name': line.partner_id.neighborhood_id.name if line.partner_id.neighborhood_id else '',
                    'address': self._partner_address(line.partner_id),
                    'leg_duration_display': self._format_duration(line.leg_duration_seconds),
                    'note': line.note or '',
                })

            report_docs.append({
                'doc': doc,
                'departure_local': departure_local,
                'origin_name': doc.origin_id.display_name,
                'origin_address': self._partner_address(doc.origin_id),
                'final_name': doc.final_id.display_name if doc.final_id else '',
                'final_address': self._partner_address(doc.final_id) if doc.final_id else '',
                'total_duration_display': self._format_duration(doc.total_duration_seconds),
                'total_stops': len(lines),
                'lines': lines,
            })

        return {
            'doc_ids': docids,
            'doc_model': 'route.history',
            'docs': docs,
            'report_docs': report_docs,
        }