# Pong Game Development Guidelines

## Running the Project
- Open `index.html` directly in any modern browser to play the game
- To create deployment package: `./create_zip.sh`
- For deployment: The game is hosted via GitHub Pages at https://porterbrough.github.io/porter-pong/
- Always run `git pull` before making changes to avoid conflicts
- After making changes: `git add .`, `git commit -m "Description"`, `git push`

## Git Workflow
- Do not commit or push automatically
- Ask for confirmation before committing/pushing changes
- When reaching a good checkpoint, ask if changes should be published
- Only proceed with git commit/push when explicitly approved

## Code Style & Organization
- **JavaScript**: Use ES6+ features with consistent 4-space indentation
- **Naming**: camelCase for variables/functions (e.g., `gameLoop`, `resetBall`), PascalCase for classes
- **Objects**: Organize related properties in objects (paddle, ball, rocket)
- **DOM Elements**: Cache in constants using descriptive names (e.g., `startButton`, `scoreDisplay`)
- **Game States**: Use boolean flags for state management (e.g., `gameRunning`, `countdownActive`)
- **Constants**: Use uppercase for constants (e.g., `ROCKET_INTERVAL`)
- **Animation**: Always use requestAnimationFrame for rendering

## Best Practices
- Handle window events defensively with appropriate cleanup
- Use setTimeout for state transitions to prevent race conditions
- Cancel animation frames when stopping game loops
- Group related functionality into dedicated functions
- Add helpful comments for complex logic
- Create visual feedback for important game events
- Ensure all game states are properly handled
- Follow semantic HTML and responsive CSS principles