from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "LARGA_Project_Acceptance_Criteria.pdf"

NAVY = colors.HexColor("#17365D")
GREEN = colors.HexColor("#2E6B57")
LIGHT_GREEN = colors.HexColor("#EAF3EF")
LIGHT_GRAY = colors.HexColor("#F4F6F8")
MID_GRAY = colors.HexColor("#D8DEE5")
TEXT = colors.HexColor("#1F2933")


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(MID_GRAY)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#667085"))
    canvas.drawString(18 * mm, 10 * mm, "LARGA Project Acceptance Criteria")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=21 * mm,
        title="LARGA Project Acceptance Criteria",
        author="LARGA Project Team",
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#667085"),
        alignment=TA_CENTER,
        spaceAfter=7 * mm,
    )
    header = ParagraphStyle(
        "Header",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.8,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
    criterion = ParagraphStyle(
        "Criterion",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=10.5,
        textColor=NAVY,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=10.7,
        textColor=TEXT,
    )
    section = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=NAVY,
        spaceAfter=4 * mm,
    )
    note = ParagraphStyle(
        "Note",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=TEXT,
    )

    criteria = [
        ("Functional Suitability", "The completed LARGA system shall let authenticated commuters view route-relevant live vehicles, ETA, route details, and computed fares while approved drivers select routes, start or stop trips, and share GPS locations."),
        ("Performance Efficiency", "The system shall update vehicle locations and ETA with minimal delay under normal internet conditions while using mobile battery, data, memory, and processing resources efficiently."),
        ("Compatibility", "The system shall operate correctly on supported Android and iOS devices and integrate reliably with Firebase, Mapbox, device GPS, and internet services."),
        ("Interaction Capability", "The system shall provide a clear map-based interface that lets drivers manage trips with minimal interaction and commuters easily understand routes, vehicles, ETA, and fare information."),
        ("Reliability", "The system shall provide consistent route, trip, and location information, reject invalid trip activation, hide stale vehicle data, handle interruptions, and provide manual location fallback."),
        ("Security", "The system shall require authentication, enforce approved commuter, driver, and administrator permissions, validate data, protect personal information, and restrict access to route-relevant records."),
        ("Maintainability", "The system shall use modular code, focused components, reusable services, clear documentation, and automated tests so individual functions can be updated without affecting unrelated features."),
        ("Flexibility", "The system shall support its defined user roles, supported mobile devices, screen sizes, routes, terminals, vehicles, and normal workload changes without major architectural modification."),
        ("Safety", "The system shall minimize driver distraction, limit unnecessary interaction while moving, show clear route or connection warnings, and disclose location information only to authorized route-relevant users."),
    ]

    story = [
        Paragraph("LARGA'S PROJECT ACCEPTANCE CRITERIA", title),
        Paragraph("Final criteria for evaluating the completed LARGA mobile transportation tracking system", subtitle),
    ]

    rows = [[Paragraph("Project Acceptance Criteria", header), Paragraph("Acceptance Description", header)]]
    for name, description in criteria:
        rows.append([Paragraph(name, criterion), Paragraph(description, body)])

    table = Table(rows, colWidths=[47 * mm, 112 * mm], repeatRows=1, hAlign="CENTER")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.55, MID_GRAY),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
            + [
                ("BACKGROUND", (0, row), (-1, row), LIGHT_GRAY if row % 2 == 0 else colors.white)
                for row in range(1, len(rows))
            ]
        )
    )
    story.extend([table, PageBreak()])

    story.extend(
        [
            Paragraph("REFERENCE AND TASK DISTRIBUTION", title),
            Paragraph("Quality model and assigned evaluation responsibilities", subtitle),
            Paragraph("Reference", section),
            Table(
                [[Paragraph("ISO/IEC 25010 - Systems and software quality models", criterion)],
                 [Paragraph("https://iso25000.com/index.php/en/iso-25000-standards/iso-25010?start=5", note)]],
                colWidths=[159 * mm],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GREEN),
                    ("BOX", (0, 0), (-1, -1), 0.7, GREEN),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, MID_GRAY),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]),
            ),
            Spacer(1, 8 * mm),
            Paragraph("Task Distribution", section),
        ]
    )

    assignments = [
        ("Functional Suitability", "Domingo, Lander Jabez T."),
        ("Performance Efficiency", "Roduta, Lester J."),
        ("Compatibility", "Roduta, Lester J."),
        ("Interaction Capability", "Domingo, Lander Jabez T."),
        ("Reliability", "Dela Cruz, Harvey B."),
        ("Security", "Cascano, Frank Marvick S."),
        ("Maintainability", "Martinez, John Kenzhin L."),
        ("Flexibility", "Dela Cruz, Harvey B."),
        ("Safety", "Cascano, Frank Marvick S."),
    ]
    assignment_rows = [[Paragraph("Criteria Name", header), Paragraph("Assigned Member", header)]]
    assignment_rows.extend([[Paragraph(a, criterion), Paragraph(b, body)] for a, b in assignments])
    assignment_table = Table(assignment_rows, colWidths=[76 * mm, 83 * mm], repeatRows=1)
    assignment_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("GRID", (0, 0), (-1, -1), 0.55, MID_GRAY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
            + [
                ("BACKGROUND", (0, row), (-1, row), LIGHT_GRAY if row % 2 == 0 else colors.white)
                for row in range(1, len(assignment_rows))
            ]
        )
    )
    story.append(assignment_table)

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
