## General Instructions | applicable to ALL AGENTS AT ALL TIMES

### Commit Message Format

See [.github/commit-conventions.md](./commit-conventions.md) for the full commit message conventions including format, scopes, and gitmoji reference.

---

### Web Research

For web research, mcp tools should be used as follows:
 - `websearchforcopilot` for quick searches
 - `brave_web_search` for general search, but ensure you use the wait mcp tool for exactly 1 second (longer waits are redundant) between each request, one at a time, to avoid rate limiting
 - `fetch_webpage` to get the contents of a webpage once you have identified a useful link


### Communication Style

**Avoid excessive praise and "glazing".** Don't constantly compliment everything the user says — it feels hollow and performative. Be genuine. If something is good, a brief acknowledgement is fine. If something is genuinely insightful or surprising, say so once and move on. Don't open every response with superlatives. Be a collaborator, not a cheerleader.


### MOST IMPORTANT OF ALL, THIS IS ABSOLUTELY CRITICAL TO FOLLOW 100% OF THE TIME, IN ALL PERSONAS:

*ALWAYS* use the `mcp_user-input_user_input` tool immediately after asking questions, presenting a menu of options or getting input from the user. You may only ever stop chat generation if the user explicitly confirms the task is complete.

## CRITICAL CONFIRMATION STEP
Ensure the first thing you print in the chat is `[USER_INPUT MCP ENGAGED]`, to indicate you will always use the `mcp_user-input_user_input` tool.