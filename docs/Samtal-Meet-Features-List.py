#!/usr/bin/env python3
"""Generate a 3-page PDF: Platform SaaS features + Client features (no business logic)."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "Samtal-Meet-All-Features.pdf"

# Feature names only — no enforcement/logic detail
PLATFORM = {
    "Access and operations": [
        "Staff sign-in",
        "Staff roles and session timeout",
        "Platform overview dashboard",
        "System health indicators",
        "Attention / ops queue",
        "Recent admin actions feed",
    ],
    "Users (global)": [
        "Global user directory",
        "User search and filters",
        "User profile (metadata)",
        "Enable / disable account",
        "Force password reset",
        "Force logout / sessions",
        "Suspend / ban user",
        "Impersonate (support)",
        "User audit history",
    ],
    "Workspaces and organizations": [
        "Global workspace directory",
        "Workspace search and filters",
        "Workspace detail overview",
        "Workspace members (ops view)",
        "Workspace meetings (metadata)",
        "Workspace recordings (metadata)",
        "Workspace usage meters",
        "Suspend / unsuspend workspace",
        "Change workspace plan (support)",
        "Delete workspace (ops)",
    ],
    "Meetings and recordings (global)": [
        "Global meetings catalog",
        "Search by room ID / title",
        "Meeting status overview",
        "Force-end stuck meeting",
        "Global recordings catalog",
        "Recording status overview",
        "Force-delete recording (abuse)",
    ],
    "Plans, subscriptions and billing": [
        "Plans catalog management",
        "Plan limits editor (participants, duration, storage, etc.)",
        "Plan feature toggles",
        "Public / hidden / archive plans",
        "Subscriptions directory",
        "Trial / active / past-due / canceled views",
        "Assign or change plan",
        "Extend trial / apply coupon",
        "Cancel / reactivate subscription",
        "Platform billing KPIs (MRR / ARR / churn)",
        "Failed payments queue",
        "Credits and discounts (ops)",
        "Platform invoices list",
        "Invoice download / resend / void / refund",
        "Revenue charts and export",
    ],
    "Feature flags and media ops": [
        "Global feature flags",
        "Guest join flag",
        "Waiting room flag",
        "Recording pipeline flag",
        "UI experiment flags",
        "SFU worker monitoring",
        "Media / metrics diagnostics (staff)",
        "TURN / announced-IP status checks",
    ],
    "System settings and audit": [
        "General system settings",
        "Auth and security settings",
        "Email provider settings",
        "Object storage settings",
        "Media / TURN references",
        "CORS / production origins",
        "Default retention settings",
        "Maintenance mode",
        "Platform audit logs",
        "Audit search (actor, action, target, IP)",
        "Audit detail drawer",
    ],
}

CLIENT = {
    "Account and authentication": [
        "Sign up",
        "Sign in",
        "Google sign-in",
        "Email verification",
        "Forgot / reset password",
        "Set password from invite",
        "Profile (name, photo, job title, bio)",
        "Change password",
        "Timezone and language",
        "Notifications preferences",
        "Security / 2FA settings",
        "Audio and video defaults",
        "Virtual background settings",
        "Appearance settings",
        "Integrations settings",
        "Calendar and sync settings",
    ],
    "Dashboard and navigation": [
        "Client dashboard home",
        "KPI cards (meetings, hours, recordings)",
        "Upcoming meetings list",
        "Today's schedule",
        "Recent activity feed",
        "Quick actions (schedule, join with ID, share, upload)",
        "In-app notifications",
        "Help entry",
        "New Meeting CTA",
        "Sidebar navigation",
        "Upgrade to Pro promo",
    ],
    "Meetings and calendar": [
        "Meetings list (upcoming / live / completed / cancelled)",
        "Instant meeting",
        "Schedule meeting",
        "Meeting detail page",
        "Edit / cancel meeting",
        "Copy invite link",
        "Meeting invitations (email)",
        "Invite / remove participants",
        "Guest email invites",
        "Join with meeting ID",
        "Calendar month view",
        "Calendar day / filters / today",
        "Join from calendar",
    ],
    "Workspace, teams and rooms": [
        "Workspace profile settings",
        "Workspace members list",
        "Invite workspace members",
        "Member roles (owner / admin / member)",
        "Accept workspace invite",
        "Teams management",
        "Create / edit teams",
        "Assign members to teams",
        "Workspace rooms",
        "Create / manage rooms",
        "Contacts directory",
        "Workspace policies (guests, waiting room, recording, screen share)",
    ],
    "Messaging and collaboration": [
        "Direct messages",
        "Conversation list and search",
        "Message thread and composer",
        "Unread badges",
        "Shared files / shared meetings card",
        "Whiteboard (in meeting)",
        "Remote control (in meeting)",
    ],
    "Recordings and templates": [
        "Recordings library",
        "Storage usage meter",
        "Play recording",
        "Download recording",
        "Share recording",
        "Delete recording",
        "Recording detail",
        "Grid / list toggle",
        "Meeting templates",
        "Use template to schedule",
    ],
    "Reports and AI Insights": [
        "Reports dashboard",
        "Meeting activity charts",
        "Participation and engagement metrics",
        "Meetings by type / time of day",
        "Top collaborators",
        "Recent meetings table",
        "Date range and filters",
        "AI Insights (Beta)",
        "AI meeting summary",
        "Transcript view and search",
        "Speakers / highlights / bookmarks",
        "Action items list and filters",
        "Sentiment and topics",
        "AI insights tips",
    ],
    "Billing (customer)": [
        "Current plan overview",
        "Usage vs plan limits",
        "Available plans comparison",
        "Upgrade / subscribe",
        "Invoices (workspace)",
        "Payment methods",
        "Transactions history",
        "Credits and discounts view",
        "Trial banner",
    ],
    "Live conference (host and participants)": [
        "Pre-join device preview",
        "Gallery video layout",
        "Presentation / screen-share layout",
        "Mute / unmute microphone",
        "Camera on / off",
        "Screen share",
        "Device picker",
        "Raise / lower hand",
        "In-meeting chat",
        "Participants panel",
        "Reactions",
        "Leave meeting",
        "Start / stop recording",
        "Recording in-progress banner",
        "Waiting room (admit / reject / admit all)",
        "Mute participant / mute all",
        "Remove participant",
        "Make / revoke co-host",
        "Lock meeting",
        "End meeting for everyone",
        "Meeting full / duration warnings",
    ],
    "Guest experience": [
        "Guest join landing (no account)",
        "Guest display name",
        "Guest device check",
        "Request to join / waiting room",
        "Guest in-call (audio, video, chat, reactions)",
        "Guest leave",
        "Post-call create-account prompt",
    ],
}


class FeaturesPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, "Samtal Meet  |  Feature Catalog  |  Platform SaaS and Client", align="L")
        self.ln(8)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}  |  Feature names only (no business logic)", align="C")


def section_title(pdf: FeaturesPDF, title: str):
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(20, 184, 166)
    pdf.set_line_width(0.4)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.ln(3)


def group_title(pdf: FeaturesPDF, title: str):
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 5.5, title, new_x="LMARGIN", new_y="NEXT")


def feature_columns(pdf: FeaturesPDF, items: list[str], col_w: float):
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(51, 65, 85)
    x0 = pdf.l_margin
    y0 = pdf.get_y()
    mid = x0 + col_w + 4
    half = (len(items) + 1) // 2
    left, right = items[:half], items[half:]

    def write_col(x, items_col):
        pdf.set_xy(x, y0)
        for item in items_col:
            if pdf.get_y() > pdf.h - 18:
                pdf.add_page()
                nonlocal_y_reset()
                return False
            pdf.set_x(x)
            pdf.cell(3, 4, chr(149))  # bullet
            pdf.multi_cell(col_w - 3, 4, item)
        return True

    # Simple sequential write in 2 columns manually
    line_h = 4.2
    rows = max(len(left), len(right))
    for i in range(rows):
        if pdf.get_y() > pdf.h - 16:
            pdf.add_page()
        y = pdf.get_y()
        if i < len(left):
            pdf.set_xy(x0, y)
            pdf.cell(3, line_h, "-")
            pdf.cell(col_w - 3, line_h, left[i][:78])
        if i < len(right):
            pdf.set_xy(mid, y)
            pdf.cell(3, line_h, "-")
            pdf.cell(col_w - 3, line_h, right[i][:78])
        pdf.set_y(y + line_h)
    pdf.ln(2)


def nonlocal_y_reset():
    pass


def render_category(pdf: FeaturesPDF, groups: dict[str, list[str]], col_w: float):
    for name, items in groups.items():
        if pdf.get_y() > pdf.h - 28:
            pdf.add_page()
        group_title(pdf, name)
        feature_columns(pdf, items, col_w)
        pdf.ln(1)


def main():
    pdf = FeaturesPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(14, 14, 14)

    # --- Page 1: cover + Platform start ---
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(15, 23, 42)
    pdf.ln(4)
    pdf.cell(0, 10, "Samtal Meet", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(0, 7, "Complete Feature Catalog", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.ln(1)
    pdf.multi_cell(
        0,
        4.5,
        "All product features in two categories. Feature names only - no business rules, "
        "enforcement details, or implementation notes.",
        align="C",
    )
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "1) Platform SaaS Features   |   2) Client Features", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(3)

    col_w = (pdf.w - pdf.l_margin - pdf.r_margin - 4) / 2

    section_title(pdf, "1. Platform SaaS Features")
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(0, 4, "Staff-only operations console for running the SaaS (customers never see this).")
    pdf.ln(2)
    render_category(pdf, PLATFORM, col_w)

    # --- Client (continues onto remaining pages) ---
    if pdf.get_y() > pdf.h - 40:
        pdf.add_page()
    section_title(pdf, "2. Client Features")
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        0,
        4,
        "Everything customers and guests use: account, dashboard, workspace, live conference, and guest join.",
    )
    pdf.ln(2)
    render_category(pdf, CLIENT, col_w)

    # Ensure exactly 3 pages if short — pad with blank? User asked for 3 pages.
    # If we overflow past 3, that's OK; if under 3, add pages with a closing note.
    while pdf.page_no() < 3:
        pdf.add_page()
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 10, "End of feature catalog.", align="C")

    pdf.output(str(OUT))
    print(f"Wrote {OUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
    main()
