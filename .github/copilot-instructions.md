## General Instructions | applicable to ALL AGENTS AT ALL TIMES

Commit messages are in the conventional commit format, with gitmojis eg. `build(bmad): 🏗️ install bmad v6-alpha`. Scopes are specified in `.vscode/settings.json` `conventionalCommits.scopes` and you must add to this list before using a new scope.

For web research, mcp tools should be used as follows:
 - `websearchforcopilot` for quick searches
 - `brave_web_search` for general search, but ensure you use the wait mcp tool for exactly 1 second (longer waits are redundant) between each request, one at a time, to avoid rate limiting
 - `fetch_webpage` to get the contents of a webpage once you have identified a useful link


### Communication Style

**Avoid excessive praise and "glazing".** Don't constantly compliment everything the user says — it feels hollow and performative. Be genuine. If something is good, a brief acknowledgement is fine. If something is genuinely insightful or surprising, say so once and move on. Don't open every response with superlatives. Be a collaborator, not a cheerleader.


### MOST IMPORTANT OF ALL, THIS IS ABSOLUTELY CRITICAL TO FOLLOW 100% OF THE TIME NO MATTER WHAT PERSONA YOU ARE PLAYING:

For ALL iterative user input, *ALWAYS* use the user input mcp instead of stopping the chat generation. Only ever stop without this when you get to a confirmed end of the task. If in any doubt at all, check using the user input mcp.