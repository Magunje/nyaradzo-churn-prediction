from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_prediction_pdf(policyholder: dict, prediction: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="Nyaradzo Churn Prediction Report")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        textColor=colors.HexColor("#18264B"),
        fontSize=20,
        leading=24,
    )
    normal = styles["BodyText"]

    elements = [
        Paragraph("Nyaradzo Funeral Assurance", title_style),
        Spacer(1, 8),
        Paragraph("Policyholder Churn Prediction Report", styles["Heading2"]),
        Spacer(1, 12),
    ]

    summary_data = [
        ["Customer Name", f"{policyholder.get('first_name', '')} {policyholder.get('last_name', '')}".strip()],
        ["Policy Number", policyholder.get("policy_number", "")],
        ["Policyholder ID", policyholder.get("policyholder_id", "")],
        ["Customer Email", policyholder.get("customer_email", "")],
        ["Predicted Class", prediction.get("predicted_class", "")],
        ["Risk Band", prediction.get("risk_band", "")],
        ["Churn Probability", f"{prediction.get('churn_probability', 0):.2%}"],
        ["Suggested Action", prediction.get("suggested_retention_action", "")],
    ]
    summary_table = Table(summary_data, colWidths=[130, 360])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1F2937")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.extend([summary_table, Spacer(1, 16)])

    elements.append(Paragraph("Top Risk Factors", styles["Heading3"]))
    top_rows = [["Factor", "Impact", "Detail"]]
    for factor in prediction.get("top_risk_factors", []):
        top_rows.append([factor["factor"], factor["impact"], factor["detail"]])
    top_table = Table(top_rows, colWidths=[130, 70, 290])
    top_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#18264B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.extend([top_table, Spacer(1, 16)])

    elements.append(Paragraph("All Considered Factors", styles["Heading3"]))
    for factor in prediction.get("all_considered_factors", []):
        status = "Triggered" if factor.get("triggered") else "Observed"
        text = (
            f"<b>{factor['factor']}</b> ({status})<br/>"
            f"Category: {factor.get('category', 'General')}<br/>"
            f"Value: {factor.get('value')}<br/>"
            f"Threshold: {factor.get('threshold')}<br/>"
            f"{factor.get('detail', '')}"
        )
        elements.append(Paragraph(text, normal))
        elements.append(Spacer(1, 8))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
