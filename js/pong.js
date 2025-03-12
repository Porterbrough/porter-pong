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
    const emojiButton = document.getElementById('emojiButton');
    const emojiModal = document.getElementById('emojiModal');
    const closeModal = document.querySelector('.close-modal');
    const emojiOptions = document.querySelectorAll('.emoji-option');
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
    let rocketTimer = null;
    let lastRocketTime = 0;
    const ROCKET_INTERVAL = 7000; // 7 seconds
    let countdownActive = false;
    let countdownValue = 3;
    let countdownTimer = null;
    
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
        maxSpeedMultiplier: 1.6, // Cap the maximum speed (60% faster than start)
        incrementFactor: 0.01, // How much to increase on each hit (smaller = slower increase)
        color: '#FFF',
        emoji: '😊',  // Smiley face emoji
        frozen: false // Track frozen state in the ball object
    };
    
    // Rocket properties
    const rocket = {
        x: 0,
        y: 0,
        width: 30,
        height: 20,
        active: false,
        baseSpeed: 3.5, // Increased speed (was 2.2)
        trackingSpeed: 2.0, // Increased tracking speed (was 1.3)
        trackingDelay: 400, // Slightly reduced delay before tracking (was 500ms)
        activationTime: 0, // When the rocket was launched
        targetPlayer: 1, // 1 or 2 to indicate which player is targeted
        emoji: '🚀',
        explosionEmoji: '💥',
        explosionRadius: 50,
        explosionActive: false,
        explosionX: 0,
        explosionY: 0,
        explosionTime: 0,
        explosionDuration: 1000, // 1 second for explosion animation
        rotation: 0 // Angle of the rocket in degrees
    };
    
    // Track original ball speeds to restore after rocket passes
    let originalBallSpeedX = 0;
    let originalBallSpeedY = 0;
    
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
    
    // Emoji button and modal handlers
    emojiButton.addEventListener('click', () => {
        emojiModal.style.display = 'block';
        
        // Highlight the currently selected emoji
        emojiOptions.forEach(option => {
            if (option.getAttribute('data-emoji') === ball.emoji) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    });
    
    // Close modal when clicking X
    closeModal.addEventListener('click', () => {
        emojiModal.style.display = 'none';
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === emojiModal) {
            emojiModal.style.display = 'none';
        }
    });
    
    // Handle emoji selection
    emojiOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedEmoji = option.getAttribute('data-emoji');
            ball.emoji = selectedEmoji;
            
            // Update visual selection
            emojiOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            // Close the modal
            setTimeout(() => {
                emojiModal.style.display = 'none';
            }, 300);
        });
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
    
    // Function to start the countdown
    function startCountdown() {
        countdownActive = true;
        countdownValue = 3;
        
        // Create countdown display
        const countdownDisplay = document.createElement('div');
        countdownDisplay.id = 'countdown';
        countdownDisplay.textContent = countdownValue;
        countdownDisplay.style.position = 'absolute';
        countdownDisplay.style.top = '50%';
        countdownDisplay.style.left = '50%';
        countdownDisplay.style.transform = 'translate(-50%, -50%)';
        countdownDisplay.style.fontSize = '100px';
        countdownDisplay.style.color = 'white';
        countdownDisplay.style.textShadow = '0 0 10px #000';
        countdownDisplay.style.zIndex = '1000';
        document.body.appendChild(countdownDisplay);
        
        // Update countdown every second
        countdownTimer = setInterval(() => {
            countdownValue--;
            
            if (countdownValue > 0) {
                countdownDisplay.textContent = countdownValue;
                // Make the countdown pulse
                countdownDisplay.style.animation = 'none';
                setTimeout(() => {
                    countdownDisplay.style.animation = 'pulse 0.5s';
                }, 10);
            } else if (countdownValue === 0) {
                countdownDisplay.textContent = 'GO!';
                countdownDisplay.style.color = '#39FF14'; // Bright green
                // Add scale animation for GO!
                countdownDisplay.style.animation = 'scale 0.5s';
            } else {
                clearInterval(countdownTimer);
                document.body.removeChild(countdownDisplay);
                countdownActive = false;
                
                // Start the game
                gameRunning = true;
                animationId = requestAnimationFrame(gameLoop);
            }
        }, 1000);
    }
    
    // Add styles for countdown animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes scale {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.5); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);
    
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
        
        // Cancel any existing countdown
        if (countdownTimer) {
            clearInterval(countdownTimer);
            const existingCountdown = document.getElementById('countdown');
            if (existingCountdown) {
                document.body.removeChild(existingCountdown);
            }
            countdownActive = false;
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
            
            // Start countdown instead of immediately starting the game
            startCountdown();
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
        
        // Cancel any existing countdown
        if (countdownTimer) {
            clearInterval(countdownTimer);
            const existingCountdown = document.getElementById('countdown');
            if (existingCountdown) {
                document.body.removeChild(existingCountdown);
            }
            countdownActive = false;
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
            
            // Start countdown instead of immediately starting the game
            startCountdown();
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
    
    // Draw rocket
    function drawRocket() {
        if (rocket.active) {
            // Determine if the rocket is in tracking mode yet
            const rocketAge = Date.now() - rocket.activationTime;
            const isTracking = rocketAge > rocket.trackingDelay;
            
            // Draw targeting area (cone of possible tracking) to give visual feedback
            if (isTracking) {
                let targetX, targetY;
                
                if (rocket.targetPlayer === 1) {
                    targetX = paddle.x;
                    targetY = paddle.y + paddle.height / 2;
                } else {
                    targetX = rightPaddle.x;
                    targetY = rightPaddle.y + rightPaddle.height / 2;
                }
                
                // Draw tracking effect
                ctx.save();
                const gradient = ctx.createRadialGradient(
                    rocket.x, rocket.y, 0,
                    rocket.x, rocket.y, 100
                );
                gradient.addColorStop(0, 'rgba(255, 50, 50, 0.15)');
                gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(rocket.x, rocket.y, 100, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw targeting line (heat seeking visualization)
                if (rocket.targetPlayer === 1) {
                    // Targeting left paddle
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)'; // Transparent red
                    ctx.setLineDash([5, 5]); // Dashed line
                    ctx.beginPath();
                    ctx.moveTo(rocket.x, rocket.y);
                    ctx.lineTo(targetX, targetY);
                    ctx.stroke();
                    ctx.setLineDash([]); // Reset dash
                } else {
                    // Targeting right paddle
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)'; // Transparent red
                    ctx.setLineDash([5, 5]); // Dashed line
                    ctx.beginPath();
                    ctx.moveTo(rocket.x, rocket.y);
                    ctx.lineTo(targetX, targetY);
                    ctx.stroke();
                    ctx.setLineDash([]); // Reset dash
                }
                ctx.restore();
            } else {
                // Straight flight indicator
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)'; // Yellow for non-tracking
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(rocket.x, rocket.y);
                if (rocket.targetPlayer === 1) {
                    ctx.lineTo(0, rocket.y); // Straight line to left
                } else {
                    ctx.lineTo(canvas.width, rocket.y); // Straight line to right
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
            
            // Draw the rocket emoji with rotation
            ctx.save();
            ctx.translate(rocket.x, rocket.y);
            ctx.rotate(rocket.rotation * Math.PI / 180);
            
            // Draw the rocket emoji
            ctx.font = `${rocket.width}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rocket.emoji, 0, 0);
            
            // Draw a flame trail behind the rocket
            ctx.font = `${rocket.width * 0.6}px Arial`;
            
            // Pulsing flame for visual effect
            const flamePulse = 0.8 + Math.sin(Date.now() / 100) * 0.2;
            ctx.scale(flamePulse, flamePulse);
            ctx.fillText('🔥', -rocket.width * 0.6 / flamePulse, 0);
            
            ctx.restore();
            
            // No tracking indicator text
        }
        
        // Draw explosion if active
        if (rocket.explosionActive) {
            const explosionProgress = (Date.now() - rocket.explosionTime) / rocket.explosionDuration;
            
            // Pulsing size based on explosion progress
            const size = rocket.explosionRadius * (1 + Math.sin(explosionProgress * Math.PI * 3) * 0.3);
            
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rocket.explosionEmoji, rocket.explosionX, rocket.explosionY);
            
            // End explosion animation after duration
            if (Date.now() > rocket.explosionTime + rocket.explosionDuration) {
                rocket.explosionActive = false;
                
                // Show game over for the player who was hit
                showRocketLoseScreen(rocket.targetPlayer);
            }
        }
    }
    
    // Launch a rocket
    function launchRocket() {
        if (rocket.active || rocket.explosionActive) return; // Don't launch if one is already active
        
        if (!isTwoPlayerMode) {
            // In one player mode, always target player 1
            rocket.targetPlayer = 1;
        } else {
            // In two player mode, alternate between player 1 and 2
            rocket.targetPlayer = (lastRocketTime === 0 || rocket.targetPlayer === 2) ? 1 : 2;
        }
        
        if (rocket.targetPlayer === 1) {
            // Rocket coming from right side of screen to target player 1
            rocket.x = canvas.width;
            rocket.y = Math.random() * canvas.height;
            rocket.rotation = 180; // Point left
        } else {
            // Rocket coming from left side of screen to target player 2
            rocket.x = 0;
            rocket.y = Math.random() * canvas.height;
            rocket.rotation = 0; // Point right
        }
        
        // Store the ball's current speed before freezing it
        if (!ball.frozen) {
            originalBallSpeedX = ball.speedX;
            originalBallSpeedY = ball.speedY;
            
            // Freeze the ball
            ball.speedX = 0;
            ball.speedY = 0;
            ball.frozen = true;
        }
        
        
        rocket.active = true;
        rocket.activationTime = Date.now();
        lastRocketTime = Date.now();
    }
    
    // Update rocket position
    function updateRocket() {
        if (!rocket.active) {
            // Check if it's time to launch a new rocket
            if (gameRunning && Date.now() > lastRocketTime + ROCKET_INTERVAL) {
                launchRocket();
            }
            
            // If no rocket is active but ball is still frozen, unfreeze it
            if (ball.frozen && !rocket.explosionActive) {
                // Restore ball speed without boost
                ball.speedX = originalBallSpeedX;
                ball.speedY = originalBallSpeedY;
                ball.frozen = false;
            }
            
            return;
        }
        
        // Calculate target paddle position (center of paddle)
        let targetX, targetY;
        
        if (rocket.targetPlayer === 1) {
            targetX = paddle.x;
            targetY = paddle.y + paddle.height / 2;
            
            // Move horizontally toward the paddle
            rocket.x -= rocket.baseSpeed;
        } else {
            targetX = rightPaddle.x;
            targetY = rightPaddle.y + rightPaddle.height / 2;
            
            // Move horizontally toward the paddle
            rocket.x += rocket.baseSpeed;
        }
        
        // Heat-seeking behavior - but only after a delay for initial straight flight
        const rocketAge = Date.now() - rocket.activationTime;
        
        if (rocketAge > rocket.trackingDelay) {
            // Calculate how much to track based on distance from paddle
            // The further away, the less precise tracking (more chance to dodge)
            const distX = Math.abs(targetX - rocket.x);
            const trackingFactor = Math.min(1.0, (canvas.width - distX) / canvas.width * 1.5);
            
            const deltaY = targetY - rocket.y;
            
            // Move toward the paddle's Y position, but with reduced accuracy based on distance
            if (Math.abs(deltaY) > 8) { // Larger buffer to prevent jitter and make dodging easier
                // Calculate tracking speed with distance-based factor and apply maximum speed limit
                const adjustedSpeed = Math.min(
                    Math.abs(deltaY) * 0.08 * trackingFactor, 
                    rocket.trackingSpeed
                );
                
                rocket.y += Math.sign(deltaY) * adjustedSpeed;
            }
            
            // Calculate rotation angle based on movement direction (for visual effect)
            const angle = Math.atan2(targetY - rocket.y, targetX - rocket.x) * 180 / Math.PI;
            
            // Smoother rotation - move gradually toward the target angle
            const currentAngle = rocket.rotation;
            const angleDiff = angle - currentAngle;
            
            // Normalize angle difference to -180 to 180
            const normalizedDiff = ((angleDiff + 180) % 360) - 180;
            
            // Apply a portion of the rotation each frame for smoother turning
            rocket.rotation += normalizedDiff * 0.1;
        }
        
        // Check for paddle collisions with improved accuracy
        if (rocket.targetPlayer === 1) {
            // More precise collision check for left paddle
            const paddleLeft = paddle.x;
            const paddleRight = paddle.x + paddle.width;
            const paddleTop = paddle.y;
            const paddleBottom = paddle.y + paddle.height;
            
            // Check if the rocket is close to the paddle
            if (rocket.x <= paddleRight && 
                rocket.x >= paddleLeft - 10 && // Give a bit of leeway
                rocket.y >= paddleTop - 10 &&
                rocket.y <= paddleBottom + 10) {
                rocketHit(1);
            }
        } else {
            // More precise collision check for right paddle
            const paddleLeft = rightPaddle.x;
            const paddleRight = rightPaddle.x + rightPaddle.width;
            const paddleTop = rightPaddle.y;
            const paddleBottom = rightPaddle.y + rightPaddle.height;
            
            // Check if the rocket is close to the paddle
            if (rocket.x >= paddleLeft - 10 && // Give a bit of leeway
                rocket.x <= paddleRight + 10 &&
                rocket.y >= paddleTop - 10 &&
                rocket.y <= paddleBottom + 10) {
                rocketHit(2);
            }
        }
        
        // Check if rocket is off screen (missed)
        if ((rocket.targetPlayer === 1 && rocket.x < -50) || 
            (rocket.targetPlayer === 2 && rocket.x > canvas.width + 50)) {
            rocket.active = false;
            
            // Unfreeze ball immediately when rocket goes off screen
            if (ball.frozen) {
                ball.speedX = originalBallSpeedX;
                ball.speedY = originalBallSpeedY;
                ball.frozen = false;
            }
        }
    }
    
    // Handle rocket hit
    function rocketHit(playerNumber) {
        // Start explosion
        rocket.explosionActive = true;
        rocket.explosionTime = Date.now();
        rocket.explosionX = playerNumber === 1 ? paddle.x : rightPaddle.x;
        rocket.explosionY = playerNumber === 1 ? paddle.y + paddle.height/2 : rightPaddle.y + rightPaddle.height/2;
        
        // Deactivate rocket
        rocket.active = false;
        
        // Keep the ball frozen until the explosion finishes
        // The ball will unfreeze in updateRocket() when the explosion ends
    }
    
    // Show lose screen for rocket hit
    function showRocketLoseScreen(playerNumber) {
        gameRunning = false;
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Set the winner text (other player wins)
        if (isTwoPlayerMode) {
            const winner = playerNumber === 1 ? 2 : 1;
            winnerText.textContent = `PLAYER ${winner} WINS!`;
            winnerMessage.textContent = `Player ${playerNumber}'s paddle was destroyed by a rocket!`;
        } else {
            // In one player mode
            if (playerNumber === 1) {
                winnerText.textContent = 'GAME OVER!';
                winnerMessage.textContent = 'Your paddle was destroyed by a rocket!';
            } else {
                winnerText.textContent = 'YOU WIN!';
                winnerMessage.textContent = 'The AI paddle was destroyed by a rocket!';
            }
        }
        
        // Remove any inline styles that might be interfering
        winnerText.style = '';
        winnerMessage.style = '';
        
        // Show win screen
        winScreen.setAttribute('style', 'display: flex !important; visibility: visible !important;');
        startButton.textContent = 'Start New Game';
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
        
        // Reset frozen state
        ball.frozen = false;
        originalBallSpeedX = 0;
        originalBallSpeedY = 0;
        
        // Reset paddle positions
        paddle.y = canvas.height / 2 - paddle.height / 2;
        rightPaddle.y = canvas.height / 2 - rightPaddle.height / 2;
        
        // Reset rocket
        rocket.active = false;
        rocket.explosionActive = false;
        lastRocketTime = Date.now();
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Collision detection
    function collisionDetection() {
        // Top and bottom collisions
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
            ball.speedY = -ball.speedY;
            
            // Very slight increase on wall bounces (much less than before)
            ball.speedY *= 1.01;
            ball.speedX *= 1.005;
            
            // Increase the global speed multiplier with a cap
            ball.speedMultiplier += ball.incrementFactor * 0.5; // Half the normal increment for walls
            
            // Cap the speed multiplier
            if (ball.speedMultiplier > ball.maxSpeedMultiplier) {
                ball.speedMultiplier = ball.maxSpeedMultiplier;
            }
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
            
            // Very small speed increase for more controllable gameplay
            ball.speedX *= 1.02;
            
            // Increase global speed multiplier by a fixed increment
            ball.speedMultiplier += ball.incrementFactor;
            
            // Cap the speed multiplier
            if (ball.speedMultiplier > ball.maxSpeedMultiplier) {
                ball.speedMultiplier = ball.maxSpeedMultiplier;
            }
            
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
                
                // Increase difficulty more gradually as score increases (one player mode only)
                const speedIncrease = 1.0 + (player1Score / 15); // More gradual increase
                const normalizedDirection = Math.sign(ball.speedX);
                
                // Clamp the speed increase to a reasonable value
                const clampedIncrease = Math.min(speedIncrease, 1.4); // Maximum 40% increase
                ball.speedX = ball.baseSpeed * clampedIncrease * normalizedDirection;
                
                // Also increase Y speed for more unpredictable movement, but more gradually
                const yDirection = Math.sign(ball.speedY);
                ball.speedY = (ball.baseSpeed * 0.8) * (1.0 + (player1Score / 30)) * yDirection;
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
                // In one player mode (against AI), small increase on AI paddle hits
                ball.speedX *= 1.03;
                
                // Increase global speed multiplier slightly more than player hits
                ball.speedMultiplier += ball.incrementFactor * 1.2;
                
                // Cap the speed multiplier
                if (ball.speedMultiplier > ball.maxSpeedMultiplier) {
                    ball.speedMultiplier = ball.maxSpeedMultiplier;
                }
            }
        }
        
        // Check if left player missed the ball
        if (ball.x - ball.radius <= 0) {
            if (isTwoPlayerMode) {
                // Player 1 loses 5 points for missing the ball
                player1Score = Math.max(0, player1Score - 5);
                score1Display.textContent = player1Score;
                
                // Show a penalty message
                showPenaltyMessage("PLAYER 1 MISS! -5 POINTS");
                
                // Check if player 2 wins
                if (player2Score >= winScore) {
                    showWinScreen(2);
                    return;
                }
                
                resetBall();
            } else {
                // In one player mode, subtract 3 points and continue
                player1Score = Math.max(0, player1Score - 3);
                score1Display.textContent = player1Score;
                
                // Show a penalty message
                showPenaltyMessage("MISS! -3 POINTS");
                
                // Reset ball position and continue
                resetBall();
            }
        }
        
        // Check if right player/AI missed the ball
        if (ball.x + ball.radius >= canvas.width) {
            if (isTwoPlayerMode) {
                // Player 2 loses 5 points for missing the ball
                player2Score = Math.max(0, player2Score - 5);
                score2Display.textContent = player2Score;
                
                // Show a penalty message
                showPenaltyMessage("PLAYER 2 MISS! -5 POINTS");
                
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
    
    // Reset ball after scoring (now used in both game modes)
    function resetBall() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.speedX = ball.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
        ball.speedY = ball.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
        // Keep the speed multiplier to maintain game intensity
    }
    
    // Function to show a temporary penalty message
    function showPenaltyMessage(message) {
        const penaltyMsg = document.createElement('div');
        penaltyMsg.textContent = message;
        penaltyMsg.style.position = 'absolute';
        penaltyMsg.style.top = '30%';
        penaltyMsg.style.left = '50%';
        penaltyMsg.style.transform = 'translate(-50%, -50%)';
        penaltyMsg.style.color = 'red';
        penaltyMsg.style.fontSize = '36px';
        penaltyMsg.style.fontWeight = 'bold';
        penaltyMsg.style.textShadow = '0 0 10px black';
        penaltyMsg.style.zIndex = '1000';
        document.body.appendChild(penaltyMsg);
        
        // Make the message fade out
        penaltyMsg.style.transition = 'opacity 1s ease-in';
        setTimeout(() => {
            penaltyMsg.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(penaltyMsg);
            }, 1000);
        }, 1000);
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
        
        // Remove any inline styles that might be interfering
        winnerText.style = '';
        winnerMessage.style = '';
        
        // Make sure the win screen is visible
        winScreen.setAttribute('style', 'display: flex !important; visibility: visible !important;');
        
        // Reset button text for next game
        startButton.textContent = 'Start New Game';
    }
    
    // Main game loop
    function gameLoop() {
        // If game isn't running anymore or countdown is active, don't update game state
        if (!gameRunning || countdownActive) {
            // Do not cancel animation frame here - this would create a race condition
            // with the restart logic which needs to control the animation frame lifecycle
            return;
        }
        
        // If rocket explosion just finished, make sure the ball is unfrozen
        // Ball should already be unfrozen by this point, but just in case
        if (!rocket.active && !rocket.explosionActive && ball.frozen) {
            // Restore ball speed with no boost
            ball.speedX = originalBallSpeedX;
            ball.speedY = originalBallSpeedY;
            ball.frozen = false;
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
        
        // Update rocket first - this may freeze the ball
        updateRocket();
        
        // Update ball position only if not frozen
        if (!ball.frozen) {
            ball.x += ball.speedX * ball.speedMultiplier;
            ball.y += ball.speedY * ball.speedMultiplier;
        }
        
        // Draw rocket after ball position update
        drawRocket();
        
        // Check for collisions only if ball is moving
        if (!ball.frozen) {
            collisionDetection();
        }
        
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