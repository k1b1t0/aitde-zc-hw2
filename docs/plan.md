# **Mini Kanban Project Scope Summary**

1. **Architecture & Real-Time Sync**:
   - WebSockets for bidirectional live updates.
   - Auto-reconnect with connection status indicator (*Connected / Reconnecting*).
2. **Authentication & Access**:
   - Simple user authentication (accounts/login).
   - Board access via shareable invite links.
3. **Collaboration & Permissions**:
   - Flat/equal permissions for all board members (everyone can create, edit, move, delete cards & columns).
   - Card locks / live editing indicators (visible avatar/badge showing who is currently on the card).
   - Live inline typing (character/field changes broadcast as you type, Google Docs style).
   - Drag-and-drop with Last-Write-Wins position resolution.
4. **Board Features (Standard Mini)**:
   - Customizable columns (add/rename/delete/reorder).
   - Cards with title, description, assignee, color labels/tags, and due dates.
5. **Tech Stack**:
   - **Backend**: Python (FastAPI + WebSockets).
   - **Frontend**: React + Vite (modern UI with drag-and-drop & live sync).
   - *(Database layer postponed per your preference).*