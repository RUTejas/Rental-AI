"""Public Streamlit companion for the RentWise AI platform.

Deploy this file to Streamlit Community Cloud. Set RENTWISE_API_URL in the
Streamlit secrets/environment to expose the live backend health indicator.
"""

import os
from datetime import datetime, timezone

import requests
import streamlit as st


st.set_page_config(page_title="RentWise AI", page_icon="🏠", layout="wide")

st.markdown(
    """
    <style>
      .stApp { background: #0B1117; color: #F7F3EC; }
      [data-testid="stMetric"] { background: #121A22; border: 1px solid #2A3441;
        padding: 1rem; border-radius: 16px; }
      h1, h2, h3 { color: #FFF8EF !important; }
      .hero { padding: 4rem 0 2rem; }
      .eyebrow { color: #C89B5E; font-weight: 700; letter-spacing: .12em;
        text-transform: uppercase; font-size: .8rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


def backend_status() -> tuple[str, str]:
    """Return a safe, public-facing health result without exposing errors."""
    api_url = os.getenv("RENTWISE_API_URL", "").rstrip("/")
    if not api_url:
        return "Not configured", "Set RENTWISE_API_URL to enable live status."
    health_url = api_url if api_url.endswith("/health") else f"{api_url}/health"
    try:
        response = requests.get(health_url, timeout=5)
        if response.ok:
            return "Operational", f"Verified {datetime.now(timezone.utc).strftime('%H:%M UTC')}"
        return "Unavailable", "The API returned an unhealthy response."
    except requests.RequestException:
        return "Unavailable", "The API could not be reached."


status, detail = backend_status()
st.markdown('<div class="hero"><p class="eyebrow">Warm Luxury Home Tech</p>', unsafe_allow_html=True)
st.title("RentWise AI")
st.subheader("Secure rental administration for property teams and tenants.")
st.write(
    "A multi-admin platform for properties, e-agreements, secure document "
    "verification, requests, audit history, and role-scoped dashboards—with no payment processing."
)
st.markdown("</div>", unsafe_allow_html=True)

left, middle, right = st.columns(3)
left.metric("Platform status", status, detail)
middle.metric("Roles", "3", "Master Admin · Admin · Tenant")
right.metric("Payment processing", "Excluded", "By design")

st.divider()
st.header("Built for controlled rental operations")
features = [
    ("Master control", "Approve admins, view global activity, audit records, and platform analytics."),
    ("Admin workspaces", "Manage only your own properties, tenants, agreements, documents, and requests."),
    ("Tenant portal", "View assigned rental information, accept agreements, upload documents, and track requests."),
    ("Secure workflows", "JWT role access, CAPTCHA, rate limiting, file-signature validation, and audit logging."),
    ("Agreement intelligence", "Clause summaries, missing-field flags, expiry awareness, and digital acceptance evidence."),
    ("Document intelligence", "Metadata summaries, document-type checks, duplicate detection, and verification workflow."),
]
for row in range(0, len(features), 3):
    columns = st.columns(3)
    for column, (title, description) in zip(columns, features[row : row + 3]):
        with column:
            st.subheader(title)
            st.write(description)

st.divider()
st.header("Role access")
role = st.radio("Explore a workspace", ["Master Admin", "Admin", "Tenant"], horizontal=True)
role_copy = {
    "Master Admin": "Global visibility and governance across admins, tenants, properties, requests, agreements, documents, and audit activity.",
    "Admin": "A private workspace limited to the properties and tenants owned by that administrator.",
    "Tenant": "A focused portal for the assigned property, agreement, documents, requests, notifications, and profile.",
}
st.info(role_copy[role])

st.caption("RentWise AI · Secure rental administration · No payment collection or payment tracking")
