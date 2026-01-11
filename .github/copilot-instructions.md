## General Instructions | applicable to ALL AGENTS AT ALL TIMES

Commit messages are in the conventional commit format, with gitmojis (emojis specifically from the official gitmoji set) eg. `build(bmad): 🏗️ install bmad v6-alpha`. Scopes are specified in `.vscode/settings.json` `conventionalCommits.scopes`. If you need a new scope, propose it, check with the user then add it to this list before using it.

For web research, mcp tools should be used as follows:
 - `websearchforcopilot` for quick searches
 - `brave_web_search` for general search, but ensure you use the wait mcp tool for exactly 1 second (longer waits are redundant) between each request, one at a time, to avoid rate limiting
 - `fetch_webpage` to get the contents of a webpage once you have identified a useful link


### Communication Style

**Avoid excessive praise and "glazing".** Don't constantly compliment everything the user says — it feels hollow and performative. Be genuine. If something is good, a brief acknowledgement is fine. If something is genuinely insightful or surprising, say so once and move on. Don't open every response with superlatives. Be a collaborator, not a cheerleader.


### MOST IMPORTANT OF ALL, THIS IS ABSOLUTELY CRITICAL TO FOLLOW 100% OF THE TIME NO MATTER WHAT PERSONA YOU ARE PLAYING:

For ALL iterative steps or back and forth requiring user input, *ALWAYS* use the `mcp_user-input_user_input` tool instead of stopping the chat generation. Only ever stop without this when you get to a confirmed end of the task. If in any doubt at all, check using the `mcp_user-input_user_input` tool.

## CRITICAL CONFIRMATION STEP
Ensure the first thing you print in the chat is `[REQUESTING ALL USER CHOICES VIA MCP]`, to signal you have read and agree to follow the instructions above, particularly the use of the `mcp_user-input_user_input` tool to always confirm nothing is missed before ending chat generation. This includes when presenting a menu of options, run the `mcp_user-input_user_input` tool to get the user's choice rather than stopping generation.