#!/usr/bin/env python3
"""Generate the Samtal Client User Guide PDF (professional SaaS style)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    FrameBreak,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent
SHOT = ROOT / "screenshots"
OUT = ROOT.parent.parent / "Samtal-Client-User-Guide.pdf"
PREP = ROOT / "_prepared"

BRAND = HexColor("#016BE6")
INK = HexColor("#151D2B")
MUTED = HexColor("#6F7B8C")
LINE = HexColor("#E1E7EE")
CANVAS = HexColor("#F5F7FA")
SOFT = HexColor("#E8F1FE")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
GUTTER = 8 * mm
# Left instructional column ~55%, right figure column ~45%
LEFT_W = (PAGE_W - 2 * MARGIN - GUTTER) * 0.55
RIGHT_W = (PAGE_W - 2 * MARGIN - GUTTER) * 0.45
SHOT_W = RIGHT_W - 2 * mm  # consistent figure width


def prepare_shot(name: str, max_w_px: int = 1000) -> Path:
    """Normalize screenshot to a consistent max width JPEG for sharp PDF embed."""
    PREP.mkdir(parents=True, exist_ok=True)
    src = SHOT / name
    dest = PREP / f"{Path(name).stem}.jpg"
    if not src.exists():
        raise FileNotFoundError(src)
    im = PILImage.open(src).convert("RGB")
    w, h = im.size
    # Some captures duplicated the viewport vertically — keep the top half when detected.
    if h >= 700 and w >= 1000:
        top = im.crop((0, 0, w, h // 2))
        bottom = im.crop((0, h // 2, w, h))
        # crude similarity: mean absolute difference on a downscale
        ts = top.resize((160, 100))
        bs = bottom.resize((160, 100))
        diff = sum(abs(a - b) for a, b in zip(ts.tobytes(), bs.tobytes())) / max(1, len(ts.tobytes()))
        if diff < 28:
            im = top
    if im.width > max_w_px:
        ratio = max_w_px / im.width
        im = im.resize((max_w_px, max(1, int(im.height * ratio))), PILImage.Resampling.LANCZOS)
    bordered = PILImage.new("RGB", (im.width + 2, im.height + 2), (225, 231, 238))
    bordered.paste(im, (1, 1))
    bordered.save(dest, "JPEG", quality=92, optimize=True)
    return dest


def shot_image(name: str):
    path = prepare_shot(name)
    im = PILImage.open(path)
    aspect = im.height / im.width
    w = SHOT_W
    h = w * aspect
    max_h = 68 * mm
    if h > max_h:
        h = max_h
        w = h / aspect
    return Image(str(path), width=w, height=h)


def step_block(number: int, title: str, body: str, shot_name: str, caption: str, styles):
    """Two-column step: instructions left, figure right. Returns a list of flowables."""
    left = Table(
        [
            [Paragraph(f"<font color='#016BE6'><b>{number}.</b></font> <b>{title}</b>", styles["StepTitle"])],
            [Spacer(1, 1.5 * mm)],
            [Paragraph(body, styles["StepBody"])],
        ],
        colWidths=[LEFT_W],
    )
    left.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    right = Table(
        [
            [shot_image(shot_name)],
            [Spacer(1, 1.2 * mm)],
            [Paragraph(caption, styles["Caption"])],
        ],
        colWidths=[RIGHT_W],
    )
    right.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    row = Table([[left, right]], colWidths=[LEFT_W + GUTTER / 2, RIGHT_W + GUTTER / 2])
    row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return [row, Spacer(1, 6 * mm)]


def section_title(text: str, styles):
    return [Paragraph(text, styles["H1"]), Spacer(1, 1 * mm)]

def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "CoverBrand": ParagraphStyle(
            "CoverBrand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=BRAND,
            tracking=1.2,
            spaceAfter=6,
        ),
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=34,
            textColor=INK,
            spaceAfter=10,
        ),
        "CoverSub": ParagraphStyle(
            "CoverSub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=20,
            textColor=MUTED,
            spaceAfter=6,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=24,
            textColor=INK,
            spaceBefore=0,
            spaceAfter=8,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=19,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=20,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "BodyJustify": ParagraphStyle(
            "BodyJustify",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=20,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "Muted": ParagraphStyle(
            "Muted",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "StepTitle": ParagraphStyle(
            "StepTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=19,
            textColor=INK,
            spaceAfter=3,
        ),
        "StepBody": ParagraphStyle(
            "StepBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=19,
            textColor=MUTED,
            spaceAfter=0,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=20,
            textColor=INK,
            leftIndent=12,
            bulletIndent=0,
            spaceAfter=3,
        ),
        "Caption": ParagraphStyle(
            "Caption",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=0,
            spaceAfter=0,
        ),
        "Footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "TOC": ParagraphStyle(
            "TOC",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=22,
            textColor=INK,
            spaceAfter=2,
        ),
    }
    return styles


def header_footer(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(MARGIN, PAGE_H - 12 * mm, PAGE_W - MARGIN, PAGE_H - 12 * mm)
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, PAGE_H - 10 * mm, "Samtal Client User Guide")
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 10 * mm, "Confidential")
        canvas.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
        canvas.drawCentredString(PAGE_W / 2, 7 * mm, f"{doc.page}")
    canvas.restoreState()


def cover_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BRAND)
    canvas.rect(0, PAGE_H - 6 * mm, PAGE_W, 6 * mm, fill=1, stroke=0)
    canvas.setFillColor(CANVAS)
    canvas.rect(0, 0, PAGE_W, 28 * mm, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 10)
    canvas.drawString(MARGIN, 14 * mm, "Screenshots from the live Samtal web application")
    canvas.restoreState()



def build():
    styles = build_styles()
    top_margin = 18 * mm
    bottom_margin = 18 * mm

    frame_full = Frame(MARGIN, bottom_margin, PAGE_W - 2 * MARGIN, PAGE_H - top_margin - bottom_margin, id="full")
    frame_content = Frame(MARGIN, bottom_margin, PAGE_W - 2 * MARGIN, PAGE_H - top_margin - bottom_margin - 4 * mm, id="content")

    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        title="Samtal Client User Guide",
        author="Samtal",
        subject="End-user documentation for the Samtal web application",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame_full], onPage=cover_footer),
            PageTemplate(id="body", frames=[frame_content], onPage=header_footer),
        ]
    )

    story = []

    # —— Cover ——
    story.append(NextPageTemplate("cover"))
    story.append(Spacer(1, 35 * mm))
    story.append(Paragraph("SAMTAL", styles["CoverBrand"]))
    story.append(Paragraph("Client User Guide", styles["CoverTitle"]))
    story.append(
        Paragraph(
            "A concise guide for first-time users. Learn how to sign up, sign in, and use the main features of the Samtal web application.",
            styles["CoverSub"],
        )
    )
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph("<b>Document type</b>&nbsp;&nbsp;End-user guide", styles["Muted"]))
    story.append(Paragraph("<b>Audience</b>&nbsp;&nbsp;Workspace members and administrators", styles["Muted"]))
    story.append(Paragraph("<b>Application</b>&nbsp;&nbsp;Samtal web client", styles["Muted"]))
    story.append(PageBreak())

    # —— Introduction ——
    story.append(NextPageTemplate("body"))
    story.extend(section_title("1. Introduction", styles))
    story.append(
        Paragraph(
            "Samtal is a conferencing workspace for organizations. After you sign in, you work inside one shared application that includes meetings, calendar, contacts, messages, recordings, templates, reports, and workspace settings.",
            styles["BodyJustify"],
        )
    )
    story.append(Paragraph("This guide explains the essential workflows using the labels that appear in the product.", styles["Body"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("<b>What you will learn</b>", styles["H2"]))
    for item in [
        "Create an account and sign in",
        "Navigate the Dashboard and sidebar",
        "Start or schedule meetings",
        "Use Calendar, Contacts, Messages, and Recordings",
        "Manage members, rooms, and billing in Workspace",
        "Update your profile in Settings",
    ]:
        story.append(Paragraph(f"• {item}", styles["Bullet"]))

    story.append(PageBreak())

    # —— Getting Started ——
    story.extend(section_title("2. Getting Started", styles))
    story.append(
        Paragraph(
            "You need a supported desktop browser, a valid email address, and network access to your Samtal site. Workspace invitations may be required before you can join an organization.",
            styles["BodyJustify"],
        )
    )
    story.append(Paragraph("<b>Recommended first path</b>", styles["H2"]))
    story.append(Paragraph("1. Create an account (Sign up) or accept an invite.", styles["Body"]))
    story.append(Paragraph("2. Sign in with your email and password.", styles["Body"]))
    story.append(Paragraph("3. Open the Dashboard and explore the blue sidebar.", styles["Body"]))
    story.append(Paragraph("4. Create a meeting with <b>New Meeting</b>.", styles["Body"]))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "The left sidebar is the primary navigation. It contains <b>Dashboard</b>, <b>Meetings</b>, <b>Calendar</b>, <b>Contacts</b>, <b>Messages</b>, <b>Recordings</b>, <b>Workspace</b>, <b>Templates</b>, <b>Reports</b>, <b>AI Insights</b> (Beta), and <b>Settings</b>.",
            styles["BodyJustify"],
        )
    )

    story.append(PageBreak())

    # —— Sign Up / Sign In ——
    story.extend(section_title("3. Sign Up / Sign In", styles))
    story.extend(
        step_block(
            1,
            "Create an account",
            "Open <b>Get started</b> or go to <b>/auth/sign-up</b>. Enter first name, last name, work email, and password. Optionally add company name and team size. Accept the Terms, then click <b>Create Account</b>.",
            "01-signup.png",
            "Figure 1: Sign up",
            styles,
        )
    )
    story.extend(
        step_block(
            2,
            "Sign in to your workspace",
            "Open <b>Sign in</b> or go to <b>/auth</b>. Enter your <b>Email address</b> and <b>Password</b>. Optionally keep <b>Remember me</b> selected, then click <b>Sign in</b>. After a successful sign-in you are taken to the Dashboard.",
            "02-signin.png",
            "Figure 2: Sign in",
            styles,
        )
    )
    story.append(Paragraph("<b>Notes</b>", styles["H2"]))
    story.append(Paragraph("• Use <b>Forgot password?</b> on the Sign in page if you need a reset link.", styles["Bullet"]))
    story.append(Paragraph("• Google sign-in appears when it is configured on the server.", styles["Bullet"]))
    story.append(Paragraph("• Microsoft sign-in may be shown as unavailable until configured.", styles["Bullet"]))

    story.append(PageBreak())

    # —— Dashboard ——
    story.extend(section_title("4. Dashboard", styles))
    story.extend(
        step_block(
            1,
            "Open the Dashboard",
            "After signing in, the <b>Dashboard</b> opens automatically. From here you see a welcome message, meeting summaries, and shortcuts. Use the blue sidebar to move between modules.",
            "03-dashboard.png",
            "Figure 3: Dashboard",
            styles,
        )
    )
    story.append(
        Paragraph(
            "Use the header control <b>New Meeting</b> to start an <b>Instant meeting</b> or create a <b>Scheduled meeting</b>. Choose <b>Create &amp; join</b> for an instant room, or <b>Create meeting</b> for a scheduled one.",
            styles["BodyJustify"],
        )
    )

    story.append(PageBreak())

    # —— Main Features ——
    story.extend(section_title("5. Main Features", styles))
    story.extend(
        step_block(
            1,
            "Meetings",
            "Open <b>Meetings</b> in the sidebar. Review upcoming and past meetings, join a room, or create a new one with <b>New Meeting</b>. Hosts can use waiting rooms and in-room controls such as mute, camera, screen share, whiteboard, and chat.",
            "04-meetings.png",
            "Figure 4: Meetings",
            styles,
        )
    )
    story.extend(
        step_block(
            2,
            "Calendar",
            "Open <b>Calendar</b>. Switch between month, week, and day views. Open a scheduled item to join the related meeting without leaving the workspace.",
            "05-calendar.png",
            "Figure 5: Calendar",
            styles,
        )
    )
    story.append(PageBreak())
    story.extend(
        step_block(
            3,
            "Contacts",
            "Open <b>Contacts</b> to find people in your organization. Use contacts when starting conversations or inviting participants to meetings.",
            "06-contacts.png",
            "Figure 6: Contacts",
            styles,
        )
    )
    story.extend(
        step_block(
            4,
            "Messages",
            "Open <b>Messages</b> for direct and team conversations. Select a thread, send messages, and keep chat next to the people you meet with.",
            "07-messages.png",
            "Figure 7: Messages",
            styles,
        )
    )
    story.append(PageBreak())
    story.extend(
        step_block(
            5,
            "Recordings",
            "Open <b>Recordings</b> to browse sessions stored on the workspace. Play, share, or download recordings when your plan and permissions allow it.",
            "08-recordings.png",
            "Figure 8: Recordings",
            styles,
        )
    )
    story.extend(
        step_block(
            6,
            "Templates",
            "Open <b>Templates</b> to reuse meeting templates and start recurring agendas faster.",
            "10-templates.png",
            "Figure 9: Templates",
            styles,
        )
    )
    story.append(PageBreak())
    story.extend(
        step_block(
            7,
            "Reports",
            "Open <b>Reports</b> to review meeting and usage information for your organization. Availability of advanced reporting depends on the workspace plan.",
            "11-reports.png",
            "Figure 10: Reports",
            styles,
        )
    )
    story.extend(
        step_block(
            8,
            "AI Insights (Beta)",
            "Open <b>AI Insights</b> to view beta insights related to workspace activity. The Beta badge in the sidebar marks this as an early feature.",
            "12-ai-insights.png",
            "Figure 11: AI Insights",
            styles,
        )
    )

    story.append(PageBreak())

    # —— User Account / Profile ——
    story.extend(section_title("6. User Account / Profile", styles))
    story.extend(
        step_block(
            1,
            "Open Settings",
            "Select <b>Settings</b> in the sidebar (or open your profile menu). Update your profile details, notification preferences, and account options on the Profile and Account screens.",
            "13-settings.png",
            "Figure 12: Settings",
            styles,
        )
    )
    story.append(
        Paragraph(
            "Sign out from the profile menu in the header when you finish your session on a shared device.",
            styles["Body"],
        )
    )

    story.append(PageBreak())

    # —— Meeting workflow ——
    story.extend(section_title("7. Meeting Workflow", styles))
    story.append(Paragraph("<b>Create a meeting</b>", styles["H2"]))
    story.append(Paragraph("1. Click <b>New Meeting</b> in the header.", styles["Body"]))
    story.append(Paragraph("2. Choose <b>Instant meeting</b> or <b>Scheduled meeting</b>.", styles["Body"]))
    story.append(Paragraph("3. Enter the required title and schedule details if needed.", styles["Body"]))
    story.append(Paragraph("4. Click <b>Create &amp; join</b> or <b>Create meeting</b>.", styles["Body"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("<b>Inside the live room</b>", styles["H2"]))
    story.append(
        Paragraph(
            "Use the control bar for Mic, Camera, Raise Hand, Screen, Participants, Chat, Whiteboard, and Leave. Guests may wait in a waiting room until a host admits them. Optional recording depends on plan permissions.",
            styles["BodyJustify"],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.extend([shot_image("04-meetings.png"), Spacer(1, 1.2*mm), Paragraph("Figure 13: Meetings list used to open or create rooms", styles["Caption"])])

    story.append(PageBreak())

    # —— Organization ——
    story.extend(section_title("8. Organization Management", styles))
    story.append(
        Paragraph(
            "Workspace owners and admins manage people and rooms from <b>Workspace</b> in the sidebar.",
            styles["Body"],
        )
    )
    story.extend(
        step_block(
            1,
            "Invite and manage members",
            "Open <b>Workspace</b> → <b>Members</b>. Click <b>Invite members</b>, enter email addresses, and assign roles such as Owner, Admin, or Member. Pending invites appear until accepted.",
            "09-workspace-members.png",
            "Figure 14: Members",
            styles,
        )
    )
    story.append(PageBreak())
    story.extend(
        step_block(
            2,
            "Manage rooms",
            "Open <b>Workspace</b> → <b>Rooms</b>. Create dedicated rooms for recurring work and manage their status from the list.",
            "15-rooms.png",
            "Figure 15: Rooms",
            styles,
        )
    )
    story.extend(
        step_block(
            3,
            "Review Billing &amp; Plan",
            "Open <b>Billing &amp; Plan</b> to see Free, Pro, or Enterprise capacity for participant minutes, members, concurrent meetings, and recording storage. Upgrade when your organization needs more capacity.",
            "14-billing.png",
            "Figure 16: Billing &amp; Plan",
            styles,
        )
    )

    story.append(PageBreak())

    # —— Important Settings ——
    story.extend(section_title("9. Important Settings", styles))
    story.append(Paragraph("• <b>Profile</b> — name, avatar, and personal details.", styles["Bullet"]))
    story.append(Paragraph("• <b>Account</b> — sign-in related account options.", styles["Bullet"]))
    story.append(Paragraph("• <b>Workspace</b> — organization name and workspace configuration.", styles["Bullet"]))
    story.append(Paragraph("• <b>Members</b> — invitations and roles.", styles["Bullet"]))
    story.append(Paragraph("• <b>Rooms</b> — dedicated meeting rooms.", styles["Bullet"]))
    story.append(Paragraph("• <b>Billing &amp; Plan</b> — plan limits and upgrades.", styles["Bullet"]))
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "Only owners and admins can change organization-level settings. Members retain access to meetings, messages, and personal settings.",
            styles["BodyJustify"],
        )
    )

    story.append(PageBreak())

    # —— Troubleshooting ——
    story.extend(section_title("10. Troubleshooting", styles))
    rows = [
        ["Issue", "What to try"],
        ["Cannot sign in", "Confirm email and password. Use Forgot password? if needed. Check that Caps Lock is off."],
        ["Blank page after Sign in", "Refresh the browser. Confirm you are using the same site origin configured for the workspace."],
        ["Cannot join a meeting", "Ask the host to admit you from the waiting room. Confirm you used the invited email."],
        ["No camera or microphone", "Allow browser permissions, then re-open the meeting room."],
        ["Missing Reports features", "Reports and auto-record scale with the workspace plan. Check Billing & Plan."],
        ["Invite not received", "Ask an admin to resend the invite and check spam. Invites use the public site origin."],
    ]
    data = [[Paragraph(f"<b>{rows[0][0]}</b>", styles["Body"]), Paragraph(f"<b>{rows[0][1]}</b>", styles["Body"])]]
    for row in rows[1:]:
        data.append([Paragraph(row[0], styles["Body"]), Paragraph(row[1], styles["Body"])])
    tbl = Table(data, colWidths=[55 * mm, PAGE_W - 2 * MARGIN - 55 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(tbl)

    story.append(PageBreak())

    # —— FAQ ——
    story.extend(section_title("11. Frequently Asked Questions", styles))
    faqs = [
        (
            "Where do I create a meeting?",
            "Use <b>New Meeting</b> in the header from almost any signed-in page, or open <b>Meetings</b> in the sidebar.",
        ),
        (
            "What is the waiting room?",
            "Guests can wait until a host admits them. Hosts control admit from the live meeting.",
        ),
        (
            "Can I share my screen?",
            "Yes. In the live room, use <b>Screen</b> on the control bar.",
        ),
        (
            "Where are recordings stored?",
            "Open <b>Recordings</b>. Storage limits follow the organization plan shown under <b>Billing &amp; Plan</b>.",
        ),
        (
            "Who can invite members?",
            "Workspace owners and admins invite people from <b>Workspace → Members</b>.",
        ),
        (
            "What does AI Insights (Beta) mean?",
            "It is an early feature. Availability and content may change as the product evolves.",
        ),
    ]
    for q, a in faqs:
        story.append(Paragraph(f"<b>{q}</b>", styles["StepTitle"]))
        story.append(Paragraph(a, styles["Body"]))
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # —— Support ——
    story.extend(section_title("12. Support / Contact", styles))
    story.append(
        Paragraph(
            "For workspace access issues, contact your organization owner or admin first. They control invitations, roles, and plan upgrades.",
            styles["BodyJustify"],
        )
    )
    story.append(
        Paragraph(
            "For product or deployment support, contact your Samtal administrator or the team that provided your site URL.",
            styles["BodyJustify"],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("© Samtal. All rights reserved.", styles["Muted"]))
    story.append(Paragraph("This guide documents the Samtal web client as deployed for your organization.", styles["Muted"]))

    doc.build(story)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
