document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pong');
    const ctx = canvas.getContext('2d');
    const score1Display = document.getElementById('score1');
    const score2Display = document.getElementById('score2');
    const startButton = document.getElementById('startButton');
    const winScreen = document.getElementById('winScreen');
    const playAgainButton = document.getElementById('playAgainButton');
    const onePlayerButton = document.getElementById('onePlayerButton');
    const twoPlayerButton = document.getElementById('twoPlayerButton');
    const onePlayerInstructions = document.getElementById('onePlayerInstructions');
    const twoPlayerInstructions = document.getElementById('twoPlayerInstructions');
    const winnerText = document.getElementById('winnerText');
    const winnerMessage = document.getElementById('winnerMessage');
    
    // Set canvas dimensions
    canvas.width = 600;
    canvas.height = 400;
    
    // Game variables
    let player1Score = 0;
    let player2Score = 0;
    let gameRunning = false;
    let animationId;
    let isTwoPlayerMode = false;
    const winScore = 10;
    
    // Keyboard state tracking
    const keys = {
        w: false,        // Player 1 up
        s: false,        // Player 1 down
        ArrowUp: false,  // Player 2 up
        ArrowDown: false // Player 2 down
    };
    
    // Paddle properties
    const paddle = {
        x: 10,
        y: canvas.height / 2 - 50,
        width: 10,
        height: 100,
        color: '#FFF',
        speed: 8
    };
    
    // Ball properties
    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 15,  // Slightly larger for the emoji
        speedX: 5,
        speedY: 5,
        baseSpeed: 5, // Base speed for reset
        speedMultiplier: 1.0, // Global speed multiplier that increases over time
        color: '#FFF',
        emoji: '😊'  // Smiley face emoji
    };
    
    // Right paddle properties (AI in 1P mode, Player 2 in 2P mode)
    const rightPaddle = {
        x: canvas.width - 20,
        y: canvas.height / 2 - 50,
        width: 10,
        height: 100,
        color: '#FFF',
        speed: 4,
        isAI: true // Will be set based on game mode
    };
    
    // Keyboard event listeners
    window.addEventListener('keydown', (e) => {
        if (e.key in keys) {
            keys[e.key] = true;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key in keys) {
            keys[e.key] = false;
        }
    });
    
    // Mode buttons
    onePlayerButton.addEventListener('click', () => {
        isTwoPlayerMode = false;
        onePlayerButton.classList.add('active');
        twoPlayerButton.classList.remove('active');
        onePlayerInstructions.style.display = 'block';
        twoPlayerInstructions.style.display = 'none';
        rightPaddle.isAI = true;
        resetGame();
    });
    
    twoPlayerButton.addEventListener('click', () => {
        isTwoPlayerMode = true;
        twoPlayerButton.classList.add('active');
        onePlayerButton.classList.remove('active');
        onePlayerInstructions.style.display = 'none';
        twoPlayerInstructions.style.display = 'block';
        rightPaddle.isAI = false;
        resetGame();
    });
    
    // Mouse movement for player paddle
    canvas.addEventListener('mousemove', (e) => {
        if (gameRunning) {
            const canvasRect = canvas.getBoundingClientRect();
            const mouseY = e.clientY - canvasRect.top;
            paddle.y = mouseY - paddle.height / 2;
            
            // Keep paddle within canvas
            if (paddle.y < 0) {
                paddle.y = 0;
            }
            if (paddle.y + paddle.height > canvas.height) {
                paddle.y = canvas.height - paddle.height;
            }
        }
    });
    
    // Touch movement for mobile
    canvas.addEventListener('touchmove', (e) => {
        if (gameRunning) {
            e.preventDefault();
            const canvasRect = canvas.getBoundingClientRect();
            const touchY = e.touches[0].clientY - canvasRect.top;
            paddle.y = touchY - paddle.height / 2;
            
            // Keep paddle within canvas
            if (paddle.y < 0) {
                paddle.y = 0;
            }
            if (paddle.y + paddle.height > canvas.height) {
                paddle.y = canvas.height - paddle.height;
            }
        }
    }, { passive: false });
    
    // Start/Restart game button
    startButton.addEventListener('click', () => {
        // First, capture the current state
        const wasRunning = gameRunning;
        
        // Stop the game
        gameRunning = false;
        
        // Cancel any existing animation frame
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Immediately clear the canvas to provide visual feedback
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Use a clean two-step process with explicit delayed restart
        setTimeout(() => {
            // Complete reset of game state
            resetGame();
            startButton.textContent = 'Restart Game';
            winScreen.style.display = 'none';
            
            // Draw initial state to show something is happening
            drawNet();
            drawPaddle(paddle.x, paddle.y, paddle.width, paddle.height, paddle.color);
            drawPaddle(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, rightPaddle.color);
            drawBall(ball.x, ball.y, ball.radius, ball.color);
            
            // Set a timeout before restarting to ensure the DOM has updated
            setTimeout(() => {
                gameRunning = true;
                animationId = requestAnimationFrame(gameLoop);
            }, 50);
        }, 100);
    });
    
    // Play again button (in win screen)
    playAgainButton.addEventListener('click', () => {
        // Make sure game is stopped
        gameRunning = false;
        
        // Cancel any existing animation frame
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Immediately clear the canvas for visual feedback
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Use the same reliable two-step restart pattern
        setTimeout(() => {
            // Complete reset
            resetGame();
            winScreen.style.display = 'none';
            startButton.textContent = 'Restart Game';
            
            // Draw initial state
            drawNet();
            drawPaddle(paddle.x, paddle.y, paddle.width, paddle.height, paddle.color);
            drawPaddle(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, rightPaddle.color);
            drawBall(ball.x, ball.y, ball.radius, ball.color);
            
            // Delay the actual game start
            setTimeout(() => {
                gameRunning = true;
                animationId = requestAnimationFrame(gameLoop);
            }, 50);
        }, 100);
    });
    
    // Draw functions
    function drawPaddle(x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    }
    
    function drawBall(x, y, radius, color) {
        // Draw the emoji instead of a circle
        ctx.font = `${radius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.emoji, x, y);
    }
    
    function drawNet() {
        ctx.beginPath();
        ctx.setLineDash([10, 15]);
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.strokeStyle = '#FFF';
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Reset game state
    function resetGame() {
        // Ensure any existing animation is cancelled
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Reset scores
        player1Score = 0;
        player2Score = 0;
        score1Display.textContent = player1Score;
        score2Display.textContent = player2Score;
        
        // Reset ball position and properties
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.speedX = ball.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
        ball.speedY = ball.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
        ball.speedMultiplier = 1.0; // Reset the speed multiplier
        
        // Reset paddle positions
        paddle.y = canvas.height / 2 - paddle.height / 2;
        rightPaddle.y = canvas.height / 2 - rightPaddle.height / 2;
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Collision detection
    function collisionDetection() {
        // Top and bottom collisions
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
            ball.speedY = -ball.speedY;
            
            // Slightly increase speed on wall bounces as well
            ball.speedY *= 1.03;
            ball.speedX *= 1.01;
            
            // Increase the global speed multiplier
            ball.speedMultiplier *= 1.02;
        }
        
        // Player 1 (left) paddle collision
        if (
            ball.x - ball.radius <= paddle.x + paddle.width &&
            ball.y >= paddle.y &&
            ball.y <= paddle.y + paddle.height &&
            ball.speedX < 0
        ) {
            ball.speedX = -ball.speedX;
            
            // Adjust angle based on where the ball hits the paddle
            const hitPosition = (ball.y - paddle.y) / paddle.height;
            ball.speedY = 10 * (hitPosition - 0.5);
            
            // Increase speed slightly
            ball.speedX *= 1.05;
            
            // Increase global speed multiplier
            ball.speedMultiplier *= 1.03;
            
            if (isTwoPlayerMode) {
                // In two-player mode, player 1 scores a point when they hit the ball
                player1Score++;
                score1Display.textContent = player1Score;
                
                // Check for win
                if (player1Score >= winScore) {
                    showWinScreen(1);
                    return;
                }
            } else {
                // In one player mode, the player scores
                player1Score++;
                score1Display.textContent = player1Score;
                
                // Check for win - only show win screen at exactly 20 points
                if (player1Score === winScore) {
                    showWinScreen(1);
                    return;
                }
                
                // Increase difficulty as score increases (one player mode only)
                const speedIncrease = 1.0 + (player1Score / 10); // More noticeable speed increase
                const normalizedDirection = Math.sign(ball.speedX);
                ball.speedX = ball.baseSpeed * speedIncrease * normalizedDirection;
                
                // Also increase Y speed for more unpredictable movement
                const yDirection = Math.sign(ball.speedY);
                ball.speedY = (ball.baseSpeed * 0.8) * (1.0 + (player1Score / 20)) * yDirection;
            }
        }
        
        // Right paddle collision (AI in 1P mode or Player 2 in 2P mode)
        if (
            ball.x + ball.radius >= rightPaddle.x &&
            ball.y >= rightPaddle.y &&
            ball.y <= rightPaddle.y + rightPaddle.height &&
            ball.speedX > 0
        ) {
            ball.speedX = -ball.speedX;
            
            // Adjust angle based on where the ball hits the paddle
            const hitPosition = (ball.y - rightPaddle.y) / rightPaddle.height;
            ball.speedY = 10 * (hitPosition - 0.5);
            
            if (isTwoPlayerMode) {
                // In two-player mode, player 2 scores a point when they hit the ball
                player2Score++;
                score2Display.textContent = player2Score;
                
                // Check for win
                if (player2Score >= winScore) {
                    showWinScreen(2);
                    return;
                }
            } else {
                // In one player mode (against AI), increase speed on AI paddle hits
                ball.speedX *= 1.08;
                
                // Increase global speed multiplier
                ball.speedMultiplier *= 1.05;
            }
        }
        
        // Check if left player missed the ball
        if (ball.x - ball.radius <= 0) {
            if (isTwoPlayerMode) {
                // Player 1 loses 5 points for missing the ball
                player1Score = Math.max(0, player1Score - 5);
                score1Display.textContent = player1Score;
                
                // Check if player 2 wins
                if (player2Score >= winScore) {
                    showWinScreen(2);
                    return;
                }
                
                resetBall();
            } else {
                // Game over in one player mode
                gameOver();
            }
        }
        
        // Check if right player/AI missed the ball
        if (ball.x + ball.radius >= canvas.width) {
            if (isTwoPlayerMode) {
                // Player 2 loses 5 points for missing the ball
                player2Score = Math.max(0, player2Score - 5);
                score2Display.textContent = player2Score;
                
                // Check if player 1 wins
                if (player1Score >= winScore) {
                    showWinScreen(1);
                    return;
                }
                
                resetBall();
            } else {
                // Just bounce the ball in one player mode
                ball.speedX = -ball.speedX;
            }
        }
    }
    
    // Reset ball after scoring (only in two-player mode)
    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.speedX = ball.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
        ball.speedY = ball.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
        // Keep the speed multiplier to maintain game intensity
    }
    
    // Update AI paddle position (only used in one-player mode)
    function updateAI() {
        if (rightPaddle.isAI) {
            const paddleCenter = rightPaddle.y + rightPaddle.height / 2;
            const ballCenter = ball.y;
            
            // Add some "difficulty" - AI won't react instantly
            // As the score increases, make the AI reaction time slower to give player more chance
            const reactionDelay = 10 + (player1Score * 0.5); // Increasing delay with score
            
            if (ball.speedX > 0) {
                if (paddleCenter < ballCenter - reactionDelay) {
                    rightPaddle.y += rightPaddle.speed;
                } else if (paddleCenter > ballCenter + reactionDelay) {
                    rightPaddle.y -= rightPaddle.speed;
                }
            }
            
            // Keep AI paddle within canvas
            if (rightPaddle.y < 0) {
                rightPaddle.y = 0;
            }
            if (rightPaddle.y + rightPaddle.height > canvas.height) {
                rightPaddle.y = canvas.height - rightPaddle.height;
            }
        }
    }
    
    // Game over function
    function gameOver() {
        // Stop the game
        gameRunning = false;
        startButton.textContent = 'Start New Game';
        
        // Make sure to cancel any existing animation frames
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Clear the canvas for visual feedback
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw the static elements to show game is over
        drawNet();
        drawPaddle(paddle.x, paddle.y, paddle.width, paddle.height, paddle.color);
        drawPaddle(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, rightPaddle.color);
        drawBall(ball.x, ball.y, ball.radius, ball.color);
    }
    
    // Win function
    function showWinScreen(winningPlayer) {
        // Stop the game
        gameRunning = false;
        
        // Make sure to cancel any existing animation frames
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Set the winner text based on the mode and winning player
        if (isTwoPlayerMode) {
            winnerText.textContent = `PLAYER ${winningPlayer} WINS!`;
            winnerMessage.textContent = `Player ${winningPlayer} reached 10 points first!`;
        } else {
            winnerText.textContent = 'YOU WIN!';
            winnerMessage.textContent = 'You reached 10 points! Amazing job!';
        }
        
        // Make sure the win screen is visible
        winScreen.setAttribute('style', 'display: flex !important; visibility: visible !important');
        
        // Reset button text for next game
        startButton.textContent = 'Start New Game';
    }
    
    // Main game loop
    function gameLoop() {
        // If game isn't running anymore, don't continue
        if (!gameRunning) {
            // Do not cancel animation frame here - this would create a race condition
            // with the restart logic which needs to control the animation frame lifecycle
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Process keyboard input for Player 1 (left paddle)
        if (keys.w) {
            paddle.y -= paddle.speed;
        }
        if (keys.s) {
            paddle.y += paddle.speed;
        }
        
        // Keep left paddle within canvas
        if (paddle.y < 0) {
            paddle.y = 0;
        }
        if (paddle.y + paddle.height > canvas.height) {
            paddle.y = canvas.height - paddle.height;
        }
        
        // Process keyboard input for Player 2 (right paddle) in two-player mode
        if (isTwoPlayerMode) {
            if (keys.ArrowUp) {
                rightPaddle.y -= rightPaddle.speed;
            }
            if (keys.ArrowDown) {
                rightPaddle.y += rightPaddle.speed;
            }
            
            // Keep right paddle within canvas
            if (rightPaddle.y < 0) {
                rightPaddle.y = 0;
            }
            if (rightPaddle.y + rightPaddle.height > canvas.height) {
                rightPaddle.y = canvas.height - rightPaddle.height;
            }
        } else {
            // In one-player mode, use arrow keys for left paddle too
            if (keys.ArrowUp) {
                paddle.y -= paddle.speed;
            }
            if (keys.ArrowDown) {
                paddle.y += paddle.speed;
            }
        }
        
        // Draw net
        drawNet();
        
        // Draw paddles and ball
        drawPaddle(paddle.x, paddle.y, paddle.width, paddle.height, paddle.color);
        drawPaddle(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, rightPaddle.color);
        drawBall(ball.x, ball.y, ball.radius, ball.color);
        
        // Update ball position, applying the global speed multiplier
        ball.x += ball.speedX * ball.speedMultiplier;
        ball.y += ball.speedY * ball.speedMultiplier;
        
        // Check for collisions
        collisionDetection();
        
        // Update AI in one-player mode
        if (!isTwoPlayerMode) {
            updateAI();
        }
        
        // Continue the game loop if the game is still running
        if (gameRunning) {
            // Store the animation ID to allow proper cancellation
            animationId = requestAnimationFrame(gameLoop);
        }
    }
    
    // Draw the initial game state
    drawPaddle(paddle.x, paddle.y, paddle.width, paddle.height, paddle.color);
    drawPaddle(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, rightPaddle.color);
    drawBall(ball.x, ball.y, ball.radius, ball.color);
    drawNet();
});