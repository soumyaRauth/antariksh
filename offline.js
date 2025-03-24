document.addEventListener('DOMContentLoaded', () => {
  // Game canvas setup
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // Fix the ID mismatch for prana bar
  const pranaBarElement = document.getElementById('oxygenBar');
  if (pranaBarElement) {
    pranaBarElement.id = 'pranaBar';
  }
  
  // Background music setup with simpler approach
  let isMusicMuted = false;
  const bgMusic = new Audio('assets/spiritual-music.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.5;
  
  // Handle audio loading error
  bgMusic.onerror = function() {
    console.log('Error loading audio file. Make sure you have a file called "spiritual-music.mp3" in an "assets" folder.');
    // Create an alert about the missing audio
    const audioAlert = document.createElement('div');
    audioAlert.style.padding = '10px';
    audioAlert.style.background = 'rgba(255,0,0,0.1)';
    audioAlert.style.color = '#FF5555';
    audioAlert.style.borderRadius = '5px';
    audioAlert.style.marginBottom = '10px';
    audioAlert.style.fontSize = '14px';
    audioAlert.innerHTML = 'Audio file not found! Create an "assets" folder and add a "spiritual-music.mp3" file for background music.';
    document.querySelector('.container').prepend(audioAlert);
  };
  
  // Create mute button
  const controlsContainer = document.querySelector('.controls') || document.body;
  const muteButton = document.createElement('button');
  muteButton.id = 'muteBtn';
  muteButton.className = 'control-btn';
  muteButton.innerHTML = '🔊';
  muteButton.style.position = 'absolute';
  muteButton.style.top = '10px';
  muteButton.style.right = '10px';
  muteButton.style.zIndex = '100';
  muteButton.style.background = 'rgba(0, 0, 0, 0.5)';
  muteButton.style.color = '#fff';
  muteButton.style.border = 'none';
  muteButton.style.borderRadius = '50%';
  muteButton.style.width = '40px';
  muteButton.style.height = '40px';
  muteButton.style.fontSize = '20px';
  muteButton.style.cursor = 'pointer';
  controlsContainer.appendChild(muteButton);
  
  // Mute button click handler
  muteButton.addEventListener('click', function() {
    isMusicMuted = !isMusicMuted;
    
    if (isMusicMuted) {
      bgMusic.pause();
      muteButton.innerHTML = '🔇';
    } else {
      bgMusic.play().catch(e => console.log("Couldn't play audio: ", e));
      muteButton.innerHTML = '🔊';
    }
  });
  
  // Try to play music on first interaction
  window.addEventListener('click', function playMusicOnFirstInteraction() {
    if (!isMusicMuted) {
      bgMusic.play().catch(e => console.log("Couldn't play audio: ", e));
    }
    window.removeEventListener('click', playMusicOnFirstInteraction);
  }, { once: true });
  
  // Game variables
  let gameStarted = false;
  let gameOver = false;
  let score = 0;
  let highScore = 0;
  let level = 1;
  let gameSpeed = 5;
  let lastTimestamp = 0;
  let isMeditating = false;
  
  // Character variables
  const player = {
    x: 100,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    velocityY: 0,
    levitationPower: -0.7,
    gravity: 0.12,
    maxVelocity: 6,
    prana: 100,
    maxPrana: 100,
    pranaDepletion: 0.03,
    shielded: false,
    shieldTime: 0,
    lives: 3,
    meditationGlow: 0
  };
  
  // Game objects
  let obstacles = [];
  let collectibles = [];
  let stars = [];
  let particles = [];
  let messages = [];
  
  // Timers
  let lastObstacleTime = 0;
  let lastCollectibleTime = 0;
  let obstacleInterval = 2000;
  let collectibleInterval = 2500;
  
  // Try to load high score from storage
  try {
    chrome.storage.local.get(['antarikshHighScore'], (result) => {
      if (result.antarikshHighScore) {
        highScore = result.antarikshHighScore;
        document.getElementById('highScore').textContent = highScore;
      }
    });
  } catch (e) {
    console.log('Chrome storage not available:', e);
  }
  
  // Create stars (celestial bodies)
  function createStars() {
    stars = []; // Clear existing stars
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }
  
  // Update and draw stars
  function updateAndDrawStars(deltaTime) {
    // Draw cosmic background
    const gradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 0,
      canvas.width/2, canvas.height/2, canvas.width
    );
    gradient.addColorStop(0, '#1A0A14');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle mandala pattern
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 5; i++) {
      const radius = 100 + i * 50;
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Update and draw stars
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      
      // Update star position
      star.x -= star.speed * gameSpeed * deltaTime / 16;
      
      // Wrap star around if it goes off screen
      if (star.x < 0) {
        star.x = canvas.width;
        star.y = Math.random() * canvas.height;
      }
      
      // Draw star
      ctx.fillStyle = i % 5 === 0 ? '#FFD700' : i % 3 === 0 ? '#E6BE8A' : 'white';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Create obstacle types
  const obstacleTypes = [
    { 
      name: 'negativity',
      width: 40, 
      height: 40, 
      color: '#8B0000',
      damage: 25,
      points: 10
    },
    { 
      name: 'illusion',
      width: 60, 
      height: 30, 
      color: '#4B0082',
      damage: 35,
      points: 15
    },
    { 
      name: 'attachment',
      width: 50, 
      height: 25, 
      color: '#800020',
      damage: 40,
      points: 20
    }
  ];
  
  // Create collectible types
  const collectibleTypes = [
    { 
      name: 'prana',
      width: 30, 
      height: 30, 
      color: '#FFD700',
      value: 25,
      points: 50
    },
    { 
      name: 'wisdom',
      width: 25, 
      height: 25, 
      color: '#E6BE8A',
      value: 15,
      points: 75
    },
    { 
      name: 'protection',
      width: 25, 
      height: 25, 
      color: '#C2B280',
      value: 0,
      points: 100,
      effect: 'shield'
    }
  ];
  
  // Draw player function - now draws a lotus flower
  function drawPlayer() {
    // Save the current context state
    ctx.save();
    
    // Center point of the lotus
    const centerX = player.x + player.width/2;
    const centerY = player.y + player.height/2;
    
    // Draw meditation aura if meditating
    if (player.meditationGlow > 0) {
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, player.width * 1.5
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${player.meditationGlow * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, player.width * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw shield effect if player is shielded
    if (player.shielded) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.lineWidth = 3;
      
      // Draw yantra shield
      // Outer circle
      ctx.beginPath();
      ctx.arc(
        centerX, 
        centerY, 
        player.width * 0.9, 
        0, 
        Math.PI * 2
      );
      ctx.stroke();
      
      // Inner triangle
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - player.width * 0.7);
      ctx.lineTo(centerX - player.width * 0.6, centerY + player.width * 0.4);
      ctx.lineTo(centerX + player.width * 0.6, centerY + player.width * 0.4);
      ctx.closePath();
      ctx.stroke();
    }
    
    // Draw the Lotus flower
    const radius = player.width * 0.45;
    const petalCount = 12;
    const petalLength = radius * 0.8;
    const petalWidth = radius * 0.35;
    
    // Draw outer petals (first layer)
    ctx.fillStyle = '#E57373'; // Light pink
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalX = centerX + Math.cos(angle) * radius * 0.6;
      const petalY = centerY + Math.sin(angle) * radius * 0.6;
      
      ctx.save();
      ctx.translate(petalX, petalY);
      ctx.rotate(angle);
      
      // Draw petal as ellipse
      ctx.beginPath();
      ctx.ellipse(0, -petalLength/2, petalWidth, petalLength, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Draw inner petals (second layer)
    ctx.fillStyle = '#F06292'; // Darker pink
    for (let i = 0; i < petalCount; i++) {
      const angle = ((i + 0.5) / petalCount) * Math.PI * 2;
      const petalX = centerX + Math.cos(angle) * radius * 0.3;
      const petalY = centerY + Math.sin(angle) * radius * 0.3;
      
      ctx.save();
      ctx.translate(petalX, petalY);
      ctx.rotate(angle);
      
      // Draw petal as ellipse
      ctx.beginPath();
      ctx.ellipse(0, -petalLength/3, petalWidth/1.5, petalLength/1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Draw center of the lotus
    ctx.fillStyle = '#FFA726'; // Orange
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Add texture to center with small dots
    ctx.fillStyle = '#FF8F00'; // Darker orange
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dotX = centerX + Math.cos(angle) * radius * 0.15;
      const dotY = centerY + Math.sin(angle) * radius * 0.15;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, radius * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add a pulsing effect if meditating
    if (isMeditating) {
      ctx.globalAlpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
      
      // Draw a subtle glow
      ctx.strokeStyle = '#FFD700'; // Gold
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, player.width/2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Restore the context state
    ctx.restore();
  }
  
  // Update player
  function updatePlayer(deltaTime) {
    // Apply gravity
    player.velocityY += player.gravity * deltaTime / 16;
    
    // Apply levitation if meditating
    if (isMeditating) {
      player.velocityY += player.levitationPower * deltaTime / 16;
      
      // Reduce prana when meditating
      player.prana -= player.pranaDepletion * deltaTime / 8;
      
      // Increase meditation glow
      player.meditationGlow = Math.min(1, player.meditationGlow + 0.05);
      
      // Create meditation particles
      if (Math.random() > 0.7) {
        createMeditationParticle();
      }
    } else {
      // Decrease meditation glow
      player.meditationGlow = Math.max(0, player.meditationGlow - 0.05);
    }
    
    // Limit velocity
    if (player.velocityY > player.maxVelocity) {
      player.velocityY = player.maxVelocity;
    } else if (player.velocityY < -player.maxVelocity) {
      player.velocityY = -player.maxVelocity;
    }
    
    // Update position
    player.y += player.velocityY;
    
    // Keep player within bounds
    if (player.y < 0) {
      player.y = 0;
      player.velocityY = 0;
    } else if (player.y > canvas.height - player.height) {
      player.y = canvas.height - player.height;
      player.velocityY = 0;
    }
    
    // Update shield
    if (player.shielded) {
      player.shieldTime -= deltaTime;
      if (player.shieldTime <= 0) {
        player.shielded = false;
      }
    }
  }
  
  // Create meditation particle
  function createMeditationParticle() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 10;
    
    particles.push({
      x: player.x + player.width/2 + Math.cos(angle) * 10,
      y: player.y + player.height/2 + Math.sin(angle) * 10,
      velocityX: Math.cos(angle) * 0.5,
      velocityY: Math.sin(angle) * 0.5 - 0.5, // Slight upward drift
      size: 2 + Math.random() * 3,
      life: 40 + Math.random() * 20,
      color: Math.random() > 0.5 ? '#FFD700' : '#FFA500' // Gold or orange
    });
  }
  
  // Update and draw particles
  function updateAndDrawParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Update particle
      particle.x += particle.velocityX * deltaTime / 16;
      particle.y += particle.velocityY * deltaTime / 16;
      particle.life -= deltaTime / 16;
      
      // Remove dead particles
      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      
      // Draw particle
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = Math.min(1, particle.life / 20);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  
  // Create obstacle
  function createObstacle() {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    obstacles.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - type.height),
      width: type.width,
      height: type.height,
      color: type.color,
      damage: type.damage,
      points: type.points,
      name: type.name
    });
  }
  
  // Update and draw obstacles
  function updateAndDrawObstacles(deltaTime) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      
      // Update obstacle position
      obstacle.x -= gameSpeed * deltaTime / 16;
      
      // Remove obstacle if it's off screen
      if (obstacle.x + obstacle.width < 0) {
        obstacles.splice(i, 1);
        continue;
      }
      
      // Draw obstacle
      ctx.fillStyle = obstacle.color;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      
      // Add a glow effect
      const gradient = ctx.createRadialGradient(
        obstacle.x + obstacle.width/2, 
        obstacle.y + obstacle.height/2, 
        0,
        obstacle.x + obstacle.width/2, 
        obstacle.y + obstacle.height/2, 
        obstacle.width
      );
      gradient.addColorStop(0, obstacle.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(
        obstacle.x - obstacle.width/2, 
        obstacle.y - obstacle.height/2, 
        obstacle.width * 2, 
        obstacle.height * 2
      );
      ctx.globalAlpha = 1;
    }
  }
  
  // Create collectible
  function createCollectible() {
    const type = collectibleTypes[Math.floor(Math.random() * collectibleTypes.length)];
    
    collectibles.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - type.height),
      width: type.width,
      height: type.height,
      color: type.color,
      value: type.value,
      points: type.points,
      name: type.name,
      effect: type.effect
    });
  }
  
  // Update and draw collectibles
  function updateAndDrawCollectibles(deltaTime) {
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const collectible = collectibles[i];
      
      // Update collectible position
      collectible.x -= gameSpeed * deltaTime / 16;
      
      // Remove collectible if it's off screen
      if (collectible.x + collectible.width < 0) {
        collectibles.splice(i, 1);
        continue;
      }
      
      // Draw collectible
      ctx.fillStyle = collectible.color;
      
      if (collectible.name === 'prana') {
        // Draw as a lotus flower
        const centerX = collectible.x + collectible.width/2;
        const centerY = collectible.y + collectible.height/2;
        const petalSize = collectible.width/3;
        
        // Draw petals
        for (let j = 0; j < 8; j++) {
          const angle = j * Math.PI / 4;
          ctx.fillStyle = '#FFD700'; // Gold
          ctx.beginPath();
          ctx.ellipse(
            centerX + Math.cos(angle) * petalSize, 
            centerY + Math.sin(angle) * petalSize, 
            petalSize, petalSize/2, 
            angle, 0, Math.PI * 2
          );
          ctx.fill();
        }
        
        // Draw center
        ctx.fillStyle = '#FFA500'; // Orange center
        ctx.beginPath();
        ctx.arc(centerX, centerY, petalSize/2, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (collectible.name === 'wisdom') {
        // Draw as a scroll
        ctx.fillRect(
          collectible.x,
          collectible.y + collectible.height/4,
          collectible.width,
          collectible.height/2
        );
        
        // Draw scroll ends
        ctx.beginPath();
        ctx.arc(
          collectible.x,
          collectible.y + collectible.height/2,
          collectible.height/4,
          Math.PI/2, -Math.PI/2,
          true
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
          collectible.x + collectible.width,
          collectible.y + collectible.height/2,
          collectible.height/4,
          -Math.PI/2, Math.PI/2,
          true
        );
        ctx.fill();
      }
      else {
        // Draw as a yantra (protection symbol)
        const centerX = collectible.x + collectible.width/2;
        const centerY = collectible.y + collectible.height/2;
        const radius = collectible.width/2;
        
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw inner triangle
        ctx.fillStyle = '#800000'; // Maroon
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius * 0.7);
        ctx.lineTo(centerX - radius * 0.6, centerY + radius * 0.4);
        ctx.lineTo(centerX + radius * 0.6, centerY + radius * 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  
  // Check collisions
  function checkCollisions() {
    // Check obstacle collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      
      if (!player.shielded && 
          player.x < obstacle.x + obstacle.width &&
          player.x + player.width > obstacle.x &&
          player.y < obstacle.y + obstacle.height &&
          player.y + player.height > obstacle.y) {
        
        // Remove obstacle
        obstacles.splice(i, 1);
        
        // Create explosion particles
        createExplosionParticles(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
        
        // Reduce prana
        reducePrana(obstacle.damage);
        
        // Add score
        score += obstacle.points;
        document.getElementById('score').textContent = Math.floor(score);
        
        // Show message
        showMessage(`-${obstacle.damage} Prana!`, player.x + player.width, player.y, '#FF5555');
      }
    }
    
    // Check collectible collisions
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const collectible = collectibles[i];
      
      if (player.x < collectible.x + collectible.width &&
          player.x + player.width > collectible.x &&
          player.y < collectible.y + collectible.height &&
          player.y + player.height > collectible.y) {
        
        // Remove collectible
        collectibles.splice(i, 1);
        
        // Create collection particles
        createCollectionParticles(collectible.x + collectible.width/2, collectible.y + collectible.height/2, collectible.color);
        
        // Apply effect
        if (collectible.effect === 'shield') {
          player.shielded = true;
          player.shieldTime = 5000; // 5 seconds of shield
          showMessage('Protection!', player.x + player.width, player.y, '#32CD32');
        } else if (collectible.value > 0) {
          addPrana(collectible.value);
        }
        
        // Add score
        score += collectible.points;
        document.getElementById('score').textContent = Math.floor(score);
      }
    }
  }
  
  // Create explosion particles
  function createExplosionParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      
      particles.push({
        x: x,
        y: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: 1 + Math.random() * 3,
        life: 20 + Math.random() * 20,
        color: '#FF5555' // Red
      });
    }
  }
  
  // Create collection particles
  function createCollectionParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      
      particles.push({
        x: x,
        y: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: 1 + Math.random() * 3,
        life: 30 + Math.random() * 20,
        color: color
      });
    }
  }
  
  // Add prana
  function addPrana(amount) {
    player.prana = Math.min(player.maxPrana, player.prana + amount);
    document.getElementById('pranaBar').style.width = player.prana + '%';
    
    // Show message
    showMessage(`+${amount} Prana!`, player.x + player.width, player.y, '#FFD700');
  }
  
  // Reduce prana
  function reducePrana(amount) {
    player.prana = Math.max(0, player.prana - amount);
    
    // Update prana bar
    document.getElementById('pranaBar').style.width = player.prana + '%';
  }
  
  // Show message
  function showMessage(text, x, y, color) {
    messages.push({
      text: text,
      x: x,
      y: y,
      velocityY: -1,
      life: 50,
      color: color
    });
  }
  
  // Update and draw messages
  function updateAndDrawMessages(deltaTime) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      
      // Update message
      message.y += message.velocityY || -1;
      message.life -= deltaTime / 16;
      
      // Remove dead messages
      if (message.life <= 0) {
        messages.splice(i, 1);
        continue;
      }
      
      // Draw message
      ctx.fillStyle = message.color || '#E6BE8A';
      ctx.font = `${message.size || 16}px Arial`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, message.life / 20);
      ctx.fillText(message.text, message.x, message.y);
      ctx.globalAlpha = 1;
    }
  }
  
  // Draw UI
  function drawUI() {
    // Draw level indicator
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level: ${level}`, 10, 10);
  }
  
  // Draw game over screen
  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FF5555';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PRANA DEPLETED', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.font = '30px Arial';
    ctx.fillText('Journey Ended', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Press Space or Meditate to Begin Again', canvas.width / 2, canvas.height / 2 + 80);
  }
  
  // Draw start screen
  function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Antariksh', canvas.width / 2, canvas.height / 2 - 80);
    
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.font = '24px Arial';
    ctx.fillText('The Cosmic Journey', canvas.width / 2, canvas.height / 2 - 40);
    
    // Instructions
    ctx.font = '18px Arial';
    ctx.fillText('Press Space or Meditate to Begin', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Hold Space or Meditate to Levitate', canvas.width / 2, canvas.height / 2 + 50);
    
    // Legend for item explanations
    const legendY = canvas.height / 2 + 90;
    const itemSpacing = 30;
    
    // Draw prana with label
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.beginPath();
    ctx.arc(canvas.width/2 - 120, legendY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.textAlign = 'left';
    ctx.fillText('Lotus: Collect for prana', canvas.width/2 - 90, legendY);
    
    // Draw obstacle with label
    ctx.fillStyle = '#8B0000'; // Dark red
    ctx.beginPath();
    ctx.arc(canvas.width/2 - 120, legendY + itemSpacing, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.fillText('Negative energies: Avoid these', canvas.width/2 - 90, legendY + itemSpacing);
    
    // Draw protection with label
    ctx.fillStyle = '#C2B280'; // Sand/gold
    ctx.beginPath();
    ctx.arc(canvas.width/2 - 120, legendY + itemSpacing*2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.fillText('Yantras: Temporary protection', canvas.width/2 - 90, legendY + itemSpacing*2);
  }
  
  // Game loop
  function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - lastTimestamp || 16;
    lastTimestamp = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw stars
    updateAndDrawStars(deltaTime);
    
    // Update and draw particles
    updateAndDrawParticles(deltaTime);
    
    // If game has started...
    if (gameStarted && !gameOver) {
      // Update player
      updatePlayer(deltaTime);
      
      // Create obstacles
      if (timestamp - lastObstacleTime > obstacleInterval) {
        createObstacle();
        lastObstacleTime = timestamp;
      }
      
      // Create collectibles
      if (timestamp - lastCollectibleTime > collectibleInterval) {
        createCollectible();
        lastCollectibleTime = timestamp;
      }
      
      // Update and draw obstacles
      updateAndDrawObstacles(deltaTime);
      
      // Update and draw collectibles
      updateAndDrawCollectibles(deltaTime);
      
      // Check collisions
      checkCollisions();
      
      // Decrease prana
      player.prana -= player.pranaDepletion * deltaTime / 16;
      if (player.prana <= 0) {
        player.prana = 0;
        loseLife();
      }
      
      // Update prana bar
      document.getElementById('pranaBar').style.width = player.prana + '%';
      
      // Increase score over time
      score += deltaTime * 0.01;
      document.getElementById('score').textContent = Math.floor(score);
      
      // Level up every 500 points
      const newLevel = 1 + Math.floor(score / 500);
      if (newLevel > level) {
        level = newLevel;
        gameSpeed += 0.5;
        obstacleInterval = Math.max(1000, obstacleInterval - 100);
        
        // Show level up message
        messages.push({
          text: `Level ${level}!`,
          x: canvas.width / 2,
          y: canvas.height / 2,
          opacity: 1,
          size: 40,
          color: '#FFD700',
          life: 60
        });
      }
    }
    
    // Draw player
    drawPlayer();
    
    // Draw messages
    updateAndDrawMessages(deltaTime);
    
    // Draw UI
    drawUI();
    
    // Draw game over screen
    if (gameOver) {
      drawGameOverScreen();
    }
    
    // Draw start screen
    if (!gameStarted) {
      drawStartScreen();
    }
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
  }
  
  // Lose life
  function loseLife() {
    player.lives--;
    document.getElementById('lives').textContent = player.lives;
    
    // Check if game over
    if (player.lives <= 0) {
      gameOver = true;
      
      // Update high score
      if (score > highScore) {
        highScore = score;
        document.getElementById('highScore').textContent = Math.floor(highScore);
        
        // Save high score
        try {
          chrome.storage.local.set({ 'antarikshHighScore': Math.floor(highScore) });
        } catch (e) {
          console.log('Chrome storage not available:', e);
        }
      }
    } else {
      // Reset player
      player.prana = player.maxPrana;
      document.getElementById('pranaBar').style.width = player.prana + '%';
      
      // Make player temporarily invulnerable
      player.shielded = true;
      player.shieldTime = 3000;
    }
  }
  
  // Reset game
  function resetGame() {
    player.y = canvas.height / 2;
    player.velocityY = 0;
    player.prana = player.maxPrana;
    player.lives = 3;
    isMeditating = false;
    
    score = 0;
    level = 1;
    gameSpeed = 5;
    obstacles = [];
    collectibles = [];
    particles = [];
    messages = [];
    
    lastObstacleTime = 0;
    lastCollectibleTime = 0;
    obstacleInterval = 2000;
    collectibleInterval = 2500;
    
    gameOver = false;
    gameStarted = true;
    
    // Update UI
    document.getElementById('score').textContent = '0';
    document.getElementById('lives').textContent = player.lives;
    document.getElementById('pranaBar').style.width = '100%';
  }
  
  // Handle keyboard down
  function handleKeyDown(e) {
    if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowUp' || e.code === 'ArrowUp') {
      if (!gameStarted) {
        gameStarted = true;
      } else if (gameOver) {
        resetGame();
      } else {
        isMeditating = true;
      }
      e.preventDefault();
    }
  }
  
  // Handle keyboard up
  function handleKeyUp(e) {
    if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowUp' || e.code === 'ArrowUp') {
      isMeditating = false;
      e.preventDefault();
    }
  }
  
  // Keyboard controls
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  // Button controls for meditate button
  const meditateButton = document.getElementById('upBtn');
  if (meditateButton) {
    meditateButton.innerHTML = 'SHAKTI';
    
    meditateButton.addEventListener('mousedown', function() {
      if (!gameStarted) {
        gameStarted = true;
      } else if (gameOver) {
        resetGame();
      } else {
        isMeditating = true;
      }
    });
    
    meditateButton.addEventListener('mouseup', function() {
      isMeditating = false;
    });
    
    meditateButton.addEventListener('mouseleave', function() {
      isMeditating = false;
    });
    
    meditateButton.addEventListener('touchstart', function(e) {
      if (!gameStarted) {
        gameStarted = true;
      } else if (gameOver) {
        resetGame();
      } else {
        isMeditating = true;
      }
      e.preventDefault();
    });
    
    meditateButton.addEventListener('touchend', function(e) {
      isMeditating = false;
      e.preventDefault();
    });
  }
  
  // Touch controls for entire canvas
  canvas.addEventListener('touchstart', function(e) {
    if (!gameStarted) {
      gameStarted = true;
    } else if (gameOver) {
      resetGame();
    } else {
      isMeditating = true;
    }
    e.preventDefault();
  });
  
  canvas.addEventListener('touchend', function(e) {
    isMeditating = false;
    e.preventDefault();
  });
  
  // Online notification
  window.addEventListener('online', () => {
    const container = document.querySelector('.container');
    const existingNotice = document.querySelector('.online-notice');
    
    if (!existingNotice && container) {
      const notice = document.createElement('div');
      notice.className = 'online-notice';
      notice.innerHTML = '<p>You\'re back online! You can continue playing or close this tab.</p>';
      container.appendChild(notice);
    }
  });
  
  // Initialize the game
  function init() {
    // Reset player position
    player.y = canvas.height / 2;
    player.velocityY = 0;
    player.lives = 3;
    player.prana = 100;
    
    // Update UI
    document.getElementById('lives').textContent = player.lives;
    document.getElementById('pranaBar').style.width = player.prana + '%';
    
    // Create stars
    createStars();
    
    // Start music if not muted
    if (!isMusicMuted) {
      bgMusic.play().catch(e => console.log("Couldn't play audio: ", e));
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
  }
  
  // Start the game
  init();
}); 