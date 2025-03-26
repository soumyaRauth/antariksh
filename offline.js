document.addEventListener('DOMContentLoaded', () => {
  // Game canvas setup
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // Fix the ID mismatch for prana bar
  const pranaBarElement = document.getElementById('oxygenBar');
  if (pranaBarElement) {
    pranaBarElement.id = 'pranaBar';
  }
  
  // Background music setup with improved looping
  let isMusicMuted = false;
  const bgMusic = new Audio('assets/spiritual-music.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.5;
  
  // Audio event listeners for better debugging
  bgMusic.addEventListener('play', () => {
    console.log('Music started playing');
  });
  
  bgMusic.addEventListener('ended', () => {
    console.log('Music ended - should loop automatically');
    // Force restart if loop fails
    if (!isMusicMuted) {
      bgMusic.currentTime = 0;
      bgMusic.play().catch(e => console.log("Couldn't restart audio: ", e));
    }
  });
  
  bgMusic.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    alert('Could not play background music. Make sure you have created the assets folder with spiritual-music.mp3 file.');
  });
  
  // Add more triggers to play music on different user interactions
  ['click', 'keydown', 'touchstart'].forEach(eventType => {
    window.addEventListener(eventType, function playMusic() {
      if (!isMusicMuted && bgMusic.paused) {
        bgMusic.play().catch(e => console.log(`Couldn't play audio on ${eventType}: `, e));
      }
      window.removeEventListener(eventType, playMusic);
    }, { once: true });
  });
  
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
  let obstacleInterval = 1500; // Decreased from original value (e.g., 2000)
  let collectibleInterval = 2500;
  let monsterInterval = 2500; // Decreased from original value
  let bossInterval = 15000; // Decreased from 20000
  
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
  
  // Color themes - refined for more elegant aesthetics
  const colorThemes = {
    spiritual: {
      name: 'Spiritual',
      background: ['#1A0A14', '#000000'],
      playerPetals: ['#F48FB1', '#EC407A'],
      playerCenter: '#FFD54F',
      stars: ['#FFFFFF', '#FFE082', '#FFECB3'],
      obstacles: {
        negativity: ['#7B1FA2', '#9C27B0'],
        illusion: ['#4527A0', '#5E35B1', '#7E57C2'],
        attachment: ['#512DA8', '#673AB7']
      },
      collectibles: {
        prana: ['#FFD54F', '#FFB300'],
        cosmic: ['#E8F5E9', '#A5D6A7']
      },
      ui: {
        container: 'rgba(49, 27, 51, 0.85)',
        text: '#D7CCC8',
        heading: '#FFD54F',
        button: ['#FF9800', '#F57C00'],
        pranaBar: ['#7B1FA2', '#FFD54F']
      }
    },
    cosmos: {
      name: 'Cosmos',
      background: ['#0D0221', '#090420'],
      playerPetals: ['#64B5F6', '#42A5F5'],
      playerCenter: '#4FC3F7',
      stars: ['#FFFFFF', '#B3E5FC', '#E1F5FE'],
      obstacles: {
        negativity: ['#D32F2F', '#F44336'],
        illusion: ['#6A1B9A', '#8E24AA', '#AB47BC'],
        attachment: ['#283593', '#3949AB']
      },
      collectibles: {
        prana: ['#4FC3F7', '#29B6F6'],
        cosmic: ['#E1F5FE', '#81D4FA']
      },
      ui: {
        container: 'rgba(13, 71, 161, 0.75)',
        text: '#E3F2FD',
        heading: '#4FC3F7',
        button: ['#039BE5', '#0277BD'],
        pranaBar: ['#01579B', '#4FC3F7']
      }
    },
    nature: {
      name: 'Nature',
      background: ['#1B5E20', '#033A16'],
      playerPetals: ['#AED581', '#9CCC65'],
      playerCenter: '#FFEE58',
      stars: ['#FFFFFF', '#DCEDC8', '#F0F4C3'],
      obstacles: {
        negativity: ['#6D4C41', '#795548'],
        illusion: ['#2E7D32', '#388E3C', '#43A047'],
        attachment: ['#689F38', '#7CB342']
      },
      collectibles: {
        prana: ['#CDDC39', '#AFB42B'],
        cosmic: ['#F1F8E9', '#C5E1A5']
      },
      ui: {
        container: 'rgba(27, 94, 32, 0.8)',
        text: '#F1F8E9',
        heading: '#CDDC39',
        button: ['#8BC34A', '#689F38'],
        pranaBar: ['#33691E', '#CDDC39']
      }
    },
    golden: {
      name: 'Golden',
      background: ['#4E342E', '#3E2723'],
      playerPetals: ['#FFCC80', '#FFB74D'],
      playerCenter: '#FFF176',
      stars: ['#FFFFFF', '#FFF9C4', '#FFF59D'],
      obstacles: {
        negativity: ['#BF360C', '#D84315'],
        illusion: ['#FF7043', '#FF5722', '#F4511E'],
        attachment: ['#A1887F', '#8D6E63']
      },
      collectibles: {
        prana: ['#FFD600', '#FFC107'],
        cosmic: ['#FFFDE7', '#FFF176']
      },
      ui: {
        container: 'rgba(62, 39, 35, 0.8)',
        text: '#EFEBE9',
        heading: '#FFD600',
        button: ['#FF9800', '#EF6C00'],
        pranaBar: ['#BF360C', '#FFD600']
      }
    }
  };
  
  // Current theme
  let currentTheme = 'spiritual';
  
  // Theme changing functionality
  function applyTheme(themeName) {
    currentTheme = themeName;
    const theme = colorThemes[themeName];
    
    // Update CSS variables for UI elements
    document.documentElement.style.setProperty('--bg-color', theme.background[0]);
    document.documentElement.style.setProperty('--container-bg', theme.ui.container);
    document.documentElement.style.setProperty('--text-color', theme.ui.text);
    document.documentElement.style.setProperty('--heading-color', theme.ui.heading);
    document.documentElement.style.setProperty('--button-start', theme.ui.button[0]);
    document.documentElement.style.setProperty('--button-end', theme.ui.button[1]);
    document.documentElement.style.setProperty('--prana-start', theme.ui.pranaBar[0]);
    document.documentElement.style.setProperty('--prana-end', theme.ui.pranaBar[1]);
    
    // Update CSS classes
    document.body.className = `theme-${themeName}`;
    
    // Save theme preference to local storage
    localStorage.setItem('antarikshTheme', themeName);
  }
  
  // Update obstacle and collectible colors based on current theme
  function getObstacleColor(obstacleType) {
    const theme = colorThemes[currentTheme];
    switch(obstacleType) {
      case 'negativity':
        return theme.obstacles.negativity[0];
      case 'illusion':
      case 'illusion-diamond':
      case 'illusion-star':
      case 'cosmic-whirl':
        return theme.obstacles.illusion[0];
      case 'attachment':
        return theme.obstacles.attachment[0];
      default:
        return '#FF0000';
    }
  }
  
  function getCollectibleColor(collectibleType) {
    const theme = colorThemes[currentTheme];
    switch(collectibleType) {
      case 'prana':
      case 'super-lotus':
        return theme.collectibles.prana[0];
      case 'wisdom':
        return theme.collectibles.prana[1];
      case 'protection':
        return theme.collectibles.prana[0];
      case 'sacred-flame':
        return theme.collectibles.prana[0];
      case 'cosmic-blessing':
        return theme.collectibles.cosmic[0];
      default:
        return '#FFFFFF';
    }
  }
  
  // Updated create stars for theme support
  function createStars() {
    stars = []; // Clear existing stars
    const theme = colorThemes[currentTheme];
    
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3,
        speed: 0.5 + Math.random() * 1.5,
        color: theme.stars[Math.floor(Math.random() * theme.stars.length)]
      });
    }
  }
  
  // Update and draw stars - modified for theme support
  function updateAndDrawStars(deltaTime) {
    // Draw cosmic background with theme colors
    const theme = colorThemes[currentTheme];
    
    const gradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 0,
      canvas.width/2, canvas.height/2, canvas.width
    );
    gradient.addColorStop(0, theme.background[0]);
    gradient.addColorStop(1, theme.background[1] || '#000000');
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
      ctx.fillStyle = i % 5 === 0 ? star.color : i % 3 === 0 ? '#E6BE8A' : 'white';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Create obstacle types - expanded with more varieties
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
    },
    // New varieties
    { 
      name: 'illusion-diamond',
      width: 55, 
      height: 55, 
      color: '#8A2BE2', // Blueviolet
      damage: 0,
      points: 25
    },
    { 
      name: 'illusion-star',
      width: 65, 
      height: 65, 
      color: '#9370DB', // Medium purple
      damage: 0,
      points: 30
    },
    { 
      name: 'cosmic-whirl',
      width: 70, 
      height: 70, 
      color: '#483D8B', // Dark slate blue
      damage: 0,
      points: 40
    }
  ];
  
  // Create collectible types - expanded with more varieties
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
    },
    // New varieties
    { 
      name: 'super-lotus',
      width: 35, 
      height: 35, 
      color: '#FFA07A', // Light salmon
      value: 40,
      points: 125
    },
    { 
      name: 'sacred-flame',
      width: 30, 
      height: 40, 
      color: '#FF8C00', // Dark orange
      value: 35,
      points: 150
    },
    { 
      name: 'cosmic-blessing',
      width: 45, 
      height: 45, 
      color: '#E0FFFF', // Light cyan
      value: 50,
      points: 200,
      effect: 'blissField'
    }
  ];
  
  // Replace the existing drawPlayer function with this new version
  function drawPlayer() {
    // Save the current context state
    ctx.save();
    
    // Center point of the star
    const centerX = player.x + player.width/2;
    const centerY = player.y + player.height/2;
    
    // Calculate rotation angle based on velocity
    const tiltAngle = player.velocityY * 0.05;
    
    // Move to center, rotate, then move back
    ctx.translate(centerX, centerY);
    ctx.rotate(tiltAngle);
    ctx.translate(-centerX, -centerY);
    
    // Calculate color based on position - creates a shifting color effect as the star moves
    const hue = (Date.now() / 20 + player.x) % 360;
    const mainColor = `hsl(${hue}, 100%, 60%)`;
    const glowColor = `hsl(${(hue + 180) % 360}, 100%, 70%)`;
    
    // Draw meditation aura if meditating
    if (player.meditationGlow > 0) {
      const gradientAura = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, player.width * 1.5
      );
      gradientAura.addColorStop(0, `rgba(255, 215, 0, ${player.meditationGlow * 0.5})`);
      gradientAura.addColorStop(1, 'rgba(255, 140, 0, 0)');
      
      ctx.fillStyle = gradientAura;
      ctx.beginPath();
      ctx.arc(centerX, centerY, player.width * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw outer glow
    const glowRadius = player.width * 0.9;
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, player.width * 0.3,
      centerX, centerY, glowRadius
    );
    glowGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.8)`);
    glowGradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, 0.4)`);
    glowGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw star shape
    const starPoints = 5;
    const outerRadius = player.width * 0.4;
    const innerRadius = player.width * 0.2;
    
    ctx.beginPath();
    for (let i = 0; i < starPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (starPoints * 2)) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    // Create a star gradient fill
    const starGradient = ctx.createRadialGradient(
      centerX, centerY, innerRadius * 0.5,
      centerX, centerY, outerRadius
    );
    starGradient.addColorStop(0, 'white');
    starGradient.addColorStop(0.5, mainColor);
    starGradient.addColorStop(1, glowColor);
    
    ctx.fillStyle = starGradient;
    ctx.fill();
    
    // Add pulsing core in the center
    const pulseSize = 1 + 0.2 * Math.sin(Date.now() / 150);
    const coreRadius = innerRadius * 0.6 * pulseSize;
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Create twinkling effect
    const twinkleCount = 3;
    const maxTwinkleLength = outerRadius * 0.8;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < twinkleCount; i++) {
      const angle = (Date.now() / 500 + i * (Math.PI * 2 / twinkleCount)) % (Math.PI * 2);
      const twinkleLength = maxTwinkleLength * (0.5 + 0.5 * Math.sin(Date.now() / 200 + i));
      
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * outerRadius,
        centerY + Math.sin(angle) * outerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * (outerRadius + twinkleLength),
        centerY + Math.sin(angle) * (outerRadius + twinkleLength)
      );
      ctx.stroke();
    }
    
    // Draw shield effect if player is shielded
    if (player.shielded) {
      const shieldPulse = 1 + 0.1 * Math.sin(Date.now() / 150);
      const shieldRadius = player.width * 0.8 * shieldPulse;
      
      // Create a rainbow shield effect
      const shieldGradient = ctx.createLinearGradient(
        centerX - shieldRadius, centerY - shieldRadius,
        centerX + shieldRadius, centerY + shieldRadius
      );
      
      shieldGradient.addColorStop(0, 'rgba(255, 0, 255, 0.5)');
      shieldGradient.addColorStop(0.25, 'rgba(0, 255, 255, 0.5)');
      shieldGradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.5)');
      shieldGradient.addColorStop(0.75, 'rgba(255, 255, 0, 0.5)');
      shieldGradient.addColorStop(1, 'rgba(255, 0, 0, 0.5)');
      
      ctx.strokeStyle = shieldGradient;
      ctx.lineWidth = 5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Restore context
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
  
  // Update and draw obstacles - adding rendering for new varieties
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
      
      // Draw obstacle based on type
      const centerX = obstacle.x + obstacle.width/2;
      const centerY = obstacle.y + obstacle.height/2;
      
      // Draw base glow effect
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, obstacle.width
      );
      gradient.addColorStop(0, obstacle.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, obstacle.width * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Draw specific obstacle type
      if (obstacle.name === 'negativity') {
        // Replace the ugly face with a more attractive dark crystal design
        const time = Date.now() / 500;
        
        // Base crystal shape with pulsing effect
        ctx.fillStyle = '#8B0000'; // Dark red
        const pulseSize = 0.8 + Math.sin(time) * 0.1;
        
        // Create spiky crystal formation
        for (let j = 0; j < 8; j++) {
          const angle = (j / 8) * Math.PI * 2;
          const spikeLength = obstacle.width * (0.3 + Math.sin(time + j) * 0.1);
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(
            centerX + Math.cos(angle) * spikeLength,
            centerY + Math.sin(angle) * spikeLength
          );
          ctx.lineTo(
            centerX + Math.cos(angle + 0.2) * (spikeLength * 0.7),
            centerY + Math.sin(angle + 0.2) * (spikeLength * 0.7)
          );
          ctx.closePath();
          ctx.fill();
        }
        
        // Dark core with pulsing glow
        const innerGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, obstacle.width * 0.3 * pulseSize
        );
        innerGradient.addColorStop(0, '#FF0000'); // Red center
        innerGradient.addColorStop(0.5, '#8B0000'); // Dark red
        innerGradient.addColorStop(1, 'rgba(0,0,0,0.5)'); // Transparent black
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, obstacle.width * 0.3 * pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add dark energy wisps
        ctx.strokeStyle = 'rgba(139, 0, 0, 0.7)';
        ctx.lineWidth = 1;
        
        for (let j = 0; j < 12; j++) {
          const angle = time + (j / 12) * Math.PI * 2;
          const length = obstacle.width * (0.3 + Math.random() * 0.2);
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          
          // Curved energy wisp
          ctx.bezierCurveTo(
            centerX + Math.cos(angle) * length * 0.5,
            centerY + Math.sin(angle) * length * 0.5,
            centerX + Math.cos(angle + 0.3) * length * 0.7,
            centerY + Math.sin(angle + 0.3) * length * 0.7,
            centerX + Math.cos(angle) * length,
            centerY + Math.sin(angle) * length
          );
          
          ctx.stroke();
        }
      }
      else if (obstacle.name === 'illusion') {
        // Draw as a mysterious shifting pattern
        const time = Date.now() / 1000;
        
        // Outer ring
        ctx.strokeStyle = '#4B0082';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, obstacle.width * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner shifting pattern
        ctx.strokeStyle = '#8A2BE2';
        ctx.lineWidth = 2;
        
        for (let j = 0; j < 6; j++) {
          const angle = time + (j / 6) * Math.PI * 2;
          const innerX = centerX + Math.cos(angle) * obstacle.width * 0.2;
          const innerY = centerY + Math.sin(angle) * obstacle.width * 0.2;
          
          ctx.beginPath();
          ctx.arc(innerX, innerY, obstacle.width * 0.1, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Distortion lines
        ctx.strokeStyle = '#9370DB';
        ctx.lineWidth = 1;
        
        for (let j = 0; j < 12; j++) {
          const angle = (j / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(
            centerX + Math.cos(angle) * obstacle.width * 0.5, 
            centerY + Math.sin(angle) * obstacle.width * 0.5
          );
          ctx.stroke();
        }
      }
      else if (obstacle.name === 'attachment') {
        // Draw as clinging chains
        ctx.fillStyle = '#800020';
        
        // Central sphere
        ctx.beginPath();
        ctx.arc(centerX, centerY, obstacle.width * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        // Chains/tentacles
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#800020';
        
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2;
          const chainLength = obstacle.width * 0.4;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          
          // Draw a wavy line
          for (let k = 0; k < 5; k++) {
            const segment = (k + 1) / 5;
            const waveOffset = Math.sin(Date.now() / 200 + j) * obstacle.width * 0.05;
            
            ctx.lineTo(
              centerX + Math.cos(angle) * chainLength * segment + waveOffset,
              centerY + Math.sin(angle) * chainLength * segment + waveOffset
            );
          }
          
          ctx.stroke();
          
          // Add a small ball at the end of each chain
          ctx.beginPath();
          ctx.arc(
            centerX + Math.cos(angle) * chainLength + Math.sin(Date.now() / 200 + j) * obstacle.width * 0.05,
            centerY + Math.sin(angle) * chainLength + Math.sin(Date.now() / 200 + j) * obstacle.width * 0.05,
            obstacle.width * 0.08,
            0, Math.PI * 2
          );
          ctx.fill();
        }
      }
      else if (obstacle.name === 'illusion-diamond') {
        // New diamond-shaped illusion
        const time = Date.now() / 800;
        
        // Rotating diamond shapes
        ctx.strokeStyle = '#9370DB'; // Medium purple
        ctx.lineWidth = 2;
        
        for (let j = 0; j < 3; j++) {
          const size = 0.25 + j * 0.15;
          const rotation = time + (j * Math.PI / 4);
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rotation);
          
          // Draw diamond
          ctx.beginPath();
          ctx.moveTo(0, -obstacle.width * size);
          ctx.lineTo(obstacle.width * size, 0);
          ctx.lineTo(0, obstacle.width * size);
          ctx.lineTo(-obstacle.width * size, 0);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        
        // Pulsing central orb
        const pulseSize = 0.15 + Math.sin(time * 2) * 0.05;
        const innerGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, obstacle.width * pulseSize
        );
        innerGradient.addColorStop(0, '#9932CC'); // Dark orchid
        innerGradient.addColorStop(1, '#4B0082'); // Indigo
        
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, obstacle.width * pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Mystical particles
        for (let j = 0; j < 8; j++) {
          const angle = time + (j / 8) * Math.PI * 2;
          const particleX = centerX + Math.cos(angle) * obstacle.width * 0.35;
          const particleY = centerY + Math.sin(angle) * obstacle.width * 0.35;
          
          ctx.fillStyle = '#E6E6FA'; // Lavender
          ctx.beginPath();
          ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      else if (obstacle.name === 'illusion-star') {
        // New star-shaped illusion
        const time = Date.now() / 1200;
        
        // Outer spinning star
        ctx.strokeStyle = '#9370DB';
        ctx.lineWidth = 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(time);
        
        // Draw star
        const points = 8;
        const outerRadius = obstacle.width * 0.4;
        const innerRadius = obstacle.width * 0.2;
        
        ctx.beginPath();
        for (let j = 0; j < points * 2; j++) {
          const radius = j % 2 === 0 ? outerRadius : innerRadius;
          const angle = (j / (points * 2)) * Math.PI * 2;
          
          if (j === 0) {
            ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          } else {
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        
        // Inner rotating elements
        for (let j = 0; j < 3; j++) {
          const rotSpeed = 0.5 + j * 0.3;
          const radius = obstacle.width * 0.15;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(time * rotSpeed);
          
          // Orbit distance
          const orbitDistance = obstacle.width * 0.2;
          
          // Draw orbiting circle
          ctx.beginPath();
          ctx.arc(orbitDistance, 0, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(147, 112, 219, ${0.8 - j * 0.2})`;
          ctx.fill();
          ctx.restore();
        }
        
        // Central light
        const pulseSize = 0.1 + Math.sin(time * 3) * 0.05;
        ctx.fillStyle = '#E6E6FA'; // Lavender
        ctx.beginPath();
        ctx.arc(centerX, centerY, obstacle.width * pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (obstacle.name === 'cosmic-whirl') {
        // Amazing cosmic spiral portal
        const time = Date.now() / 1000;
        
        // Spinning galaxy effect
        for (let j = 0; j < 4; j++) {
          const armWidth = 0.1 + j * 0.05;
          const rotationOffset = j * (Math.PI / 2);
          const gradientColors = ['#483D8B', '#7B68EE', '#9370DB', '#8A2BE2'];
          
          ctx.save();
          ctx.translate(centerX, centerY);
          
          // Create spiral arm
          ctx.strokeStyle = gradientColors[j % gradientColors.length];
          ctx.lineWidth = 3;
          
          ctx.beginPath();
          for (let k = 0; k < 30; k++) {
            const t = k / 30;
            const radius = t * obstacle.width * 0.5;
            const angle = time * 2 + rotationOffset + t * 10;
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (k === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
          ctx.restore();
        }
        
        // Swirling central vortex
        const vortexGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, obstacle.width * 0.3
        );
        vortexGradient.addColorStop(0, '#E6E6FA'); // Lavender
        vortexGradient.addColorStop(0.5, '#9370DB'); // Medium purple
        vortexGradient.addColorStop(1, '#483D8B'); // Dark slate blue
        
        ctx.fillStyle = vortexGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, obstacle.width * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Particle effects around the vortex
        for (let j = 0; j < 12; j++) {
          const angle = time * 3 + (j / 12) * Math.PI * 2;
          const distance = obstacle.width * (0.3 + Math.sin(time * 2 + j) * 0.1);
          
          const particleX = centerX + Math.cos(angle) * distance;
          const particleY = centerY + Math.sin(angle) * distance;
          const particleSize = 1 + Math.sin(time * 4 + j) * 1;
          
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
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
  
  // Update and draw collectibles - adding rendering for new collectibles
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
      
      const centerX = collectible.x + collectible.width/2;
      const centerY = collectible.y + collectible.height/2;
      
      if (collectible.name === 'prana') {
        // Draw as a more elaborate lotus flower
        const radius = collectible.width/2;
        const petalCount = 12;
        const innerPetalCount = 8;
        const time = Date.now() / 1000;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 1.5
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer petals
        ctx.fillStyle = '#FFCBA4'; // Peach
        for (let j = 0; j < petalCount; j++) {
          const angle = (j / petalCount) * Math.PI * 2 + time * 0.2;
          const petalLength = radius * 0.8;
          const petalWidth = radius * 0.25;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          // Draw petal
          ctx.beginPath();
          ctx.ellipse(0, -radius/2, petalWidth, petalLength, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Inner petals
        ctx.fillStyle = '#FFA07A'; // Light salmon
        for (let j = 0; j < innerPetalCount; j++) {
          const angle = (j / innerPetalCount) * Math.PI * 2 + time * 0.1 + Math.PI/innerPetalCount;
          const petalLength = radius * 0.6;
          const petalWidth = radius * 0.15;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          // Draw petal
          ctx.beginPath();
          ctx.ellipse(0, -radius/3, petalWidth, petalLength, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Center
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Center details
        ctx.fillStyle = '#FF8C00'; // Dark orange
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2;
          const dotX = centerX + Math.cos(angle) * radius * 0.15;
          const dotY = centerY + Math.sin(angle) * radius * 0.15;
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, radius * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      else if (collectible.name === 'wisdom') {
        // Draw as an ancient glowing scroll with Sanskrit symbols
        const width = collectible.width;
        const height = collectible.height;
        
        // Scroll paper
        ctx.fillStyle = '#F5DEB3'; // Wheat color
        ctx.beginPath();
        ctx.roundRect(collectible.x, collectible.y + height/4, width, height/2, [5]);
        ctx.fill();
        
        // Scroll rollers
        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.beginPath();
        ctx.arc(
          collectible.x,
          collectible.y + height/2,
          height/4,
          Math.PI/2, -Math.PI/2,
          true
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
          collectible.x + width,
          collectible.y + height/2,
          height/4,
          -Math.PI/2, Math.PI/2,
          true
        );
        ctx.fill();
        
        // Ancient writing (simplified Sanskrit-like symbols)
        ctx.fillStyle = '#800000'; // Maroon
        ctx.font = `${height/3}px Arial`;
        ctx.fillText('ॐ', collectible.x + width/2 - height/6, collectible.y + height/2 + height/10);
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, width
        );
        gradient.addColorStop(0, 'rgba(255, 223, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 223, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, width, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (collectible.name === 'protection') {
        // Draw as an elaborate yantra (sacred geometry)
        const radius = collectible.width/2;
        const time = Date.now() / 2000;
        
        // Background glow
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer circle
        ctx.strokeStyle = '#C2B280';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        
        // Middle circle with rotating effect
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner triangles (Sri Yantra style)
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1.5;
        
        // Downward triangle
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius * 0.5);
        ctx.lineTo(centerX - radius * 0.4, centerY + radius * 0.2);
        ctx.lineTo(centerX + radius * 0.4, centerY + radius * 0.2);
        ctx.closePath();
        ctx.stroke();
        
        // Upward triangle
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + radius * 0.5);
        ctx.lineTo(centerX - radius * 0.4, centerY - radius * 0.2);
        ctx.lineTo(centerX + radius * 0.4, centerY - radius * 0.2);
        ctx.closePath();
        ctx.stroke();
        
        // Central dot (bindu)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotating outer dots
        for (let j = 0; j < 8; j++) {
          const angle = time + (j / 8) * Math.PI * 2;
          const dotX = centerX + Math.cos(angle) * radius * 0.6;
          const dotY = centerY + Math.sin(angle) * radius * 0.6;
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, radius * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      else if (collectible.name === 'super-lotus') {
        // Enhanced super lotus with extra effects
        const radius = collectible.width/2;
        const petalCount = 16; // More petals
        const innerPetalCount = 12; // More inner petals
        const time = Date.now() / 800; // Faster animation
        
        // Enhanced glow effect
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer petals with gradient colors
        for (let j = 0; j < petalCount; j++) {
          const angle = (j / petalCount) * Math.PI * 2 + time * 0.3;
          const petalLength = radius * (0.8 + Math.sin(time + j) * 0.1);
          const petalWidth = radius * 0.2;
          
          // Create gradient for petal
          const petalGradient = ctx.createLinearGradient(
            centerX, centerY,
            centerX + Math.cos(angle) * petalLength,
            centerY + Math.sin(angle) * petalLength
          );
          petalGradient.addColorStop(0, '#FFA07A'); // Light salmon
          petalGradient.addColorStop(1, '#FF8C00'); // Dark orange
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          // Draw petal
          ctx.fillStyle = petalGradient;
          ctx.beginPath();
          ctx.ellipse(0, -radius/2, petalWidth, petalLength, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Middle layer petals with more vivid color
        for (let j = 0; j < innerPetalCount; j++) {
          const angle = (j / innerPetalCount) * Math.PI * 2 + time * 0.2 + Math.PI/innerPetalCount;
          const petalLength = radius * 0.6;
          const petalWidth = radius * 0.15;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          // Draw petal
          ctx.fillStyle = '#FF7F50'; // Coral
          ctx.beginPath();
          ctx.ellipse(0, -radius/3, petalWidth, petalLength, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        // Center with gem-like appearance
        const centerGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 0.3
        );
        centerGradient.addColorStop(0, 'white');
        centerGradient.addColorStop(0.5, '#FFD700');
        centerGradient.addColorStop(1, '#FF8C00');
        
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Sparkle effects
        for (let j = 0; j < 4; j++) {
          const sparkAngle = time * 2 + (j * Math.PI/2);
          const sparkX = centerX + Math.cos(sparkAngle) * radius * 0.6;
          const sparkY = centerY + Math.sin(sparkAngle) * radius * 0.6;
          
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          
          // Draw sparkle
          ctx.beginPath();
          ctx.moveTo(sparkX - 3, sparkY);
          ctx.lineTo(sparkX + 3, sparkY);
          ctx.moveTo(sparkX, sparkY - 3);
          ctx.lineTo(sparkX, sparkY + 3);
          ctx.stroke();
        }
      }
      else if (collectible.name === 'sacred-flame') {
        // Sacred flame collectible
        const radius = collectible.width/2;
        const time = Date.now() / 200; // Fast animation
        
        // Flame base glow
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 2
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Animated flame
        for (let j = 0; j < 5; j++) {
          // Create differently colored flames from inside out
          const colors = ['#FFFFFF', '#FFFF00', '#FFD700', '#FFA500', '#FF4500'];
          ctx.fillStyle = colors[j];
          
          ctx.beginPath();
          ctx.moveTo(centerX - radius * 0.3, centerY + radius * 0.4); // Left base
          
          // Control points for the curves - with animation
          const waveOffset = Math.sin(time + j) * radius * 0.1;
          const heightOffset = Math.cos(time * 0.7 + j) * radius * 0.1;
          
          // Left side of flame
          ctx.bezierCurveTo(
            centerX - radius * 0.4, centerY, // Control point 1
            centerX - radius * (0.3 - j*0.05) + waveOffset, centerY - radius * (0.5 + j*0.1), // Control point 2
            centerX, centerY - radius * (0.7 + j*0.15) + heightOffset // Top of flame
          );
          
          // Right side of flame
          ctx.bezierCurveTo(
            centerX + radius * (0.3 - j*0.05) - waveOffset, centerY - radius * (0.5 + j*0.1), // Control point 3
            centerX + radius * 0.4, centerY, // Control point 4
            centerX + radius * 0.3, centerY + radius * 0.4 // Right base
          );
          
          ctx.closePath();
          ctx.fill();
        }
        
        // Base of the flame
        const baseGradient = ctx.createLinearGradient(
          centerX, centerY + radius * 0.4,
          centerX, centerY + radius * 0.6
        );
        baseGradient.addColorStop(0, '#FFA500');
        baseGradient.addColorStop(1, '#8B4513');
        
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + radius * 0.5, radius * 0.4, radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Sparkles around the flame
        ctx.fillStyle = 'white';
        for (let j = 0; j < 6; j++) {
          const sparkAngle = time * 2 + (j * Math.PI/3);
          const distance = radius * (0.8 + Math.sin(time + j) * 0.2);
          const sparkX = centerX + Math.cos(sparkAngle) * distance;
          const sparkY = centerY + Math.sin(sparkAngle) * distance;
          
          // Tiny star shape
          const sparkSize = 1 + Math.random();
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      else if (collectible.name === 'cosmic-blessing') {
        // Cosmic blessing - a beautiful mandala pattern
        const radius = collectible.width/2;
        const time = Date.now() / 1500;
        
        // Ethereal glow
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 2.5
        );
        gradient.addColorStop(0, 'rgba(224, 255, 255, 0.9)'); // Light cyan
        gradient.addColorStop(0.4, 'rgba(173, 216, 230, 0.6)'); // Light blue
        gradient.addColorStop(0.7, 'rgba(135, 206, 235, 0.3)'); // Sky blue
        gradient.addColorStop(1, 'rgba(135, 206, 250, 0)'); // Light sky blue
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Mandala patterns - multiple rotating layers
        for (let layer = 0; layer < 4; layer++) {
          const layerPoints = 8 + layer * 4;
          const rotation = time * (layer % 2 === 0 ? 1 : -1) * 0.5;
          const layerRadius = radius * (0.4 + layer * 0.15);
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rotation);
          
          // Draw points around the circle
          for (let j = 0; j < layerPoints; j++) {
            const angle = (j / layerPoints) * Math.PI * 2;
            const x = Math.cos(angle) * layerRadius;
            const y = Math.sin(angle) * layerRadius;
            
            // Draw a petal or geometric shape from center to point
            ctx.beginPath();
            
            // Different patterns for different layers
            if (layer === 0) {
              // Inner layer: simple small circles
              ctx.arc(x, y, radius * 0.05, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.fill();
            } else if (layer === 1) {
              // Second layer: connecting lines
              if (j % 2 === 0) {
                ctx.moveTo(0, 0);
                ctx.lineTo(x, y);
                ctx.strokeStyle = 'rgba(200, 255, 255, 0.7)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            } else if (layer === 2) {
              // Third layer: triangular petals
              const nextAngle = ((j + 1) / layerPoints) * Math.PI * 2;
              ctx.moveTo(0, 0);
              ctx.lineTo(x, y);
              ctx.lineTo(Math.cos(nextAngle) * layerRadius, Math.sin(nextAngle) * layerRadius);
              ctx.closePath();
              ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
              ctx.fill();
            } else if (layer === 3) {
              // Outer layer: diamond shapes
              const midRadius = layerRadius * 0.7;
              const midX = Math.cos(angle) * midRadius;
              const midY = Math.sin(angle) * midRadius;
              
              const nextAngle = ((j + 1) / layerPoints) * Math.PI * 2;
              const nextMidX = Math.cos(nextAngle) * midRadius;
              const nextMidY = Math.sin(nextAngle) * midRadius;
              
              ctx.moveTo(x, y);
              ctx.lineTo(midX, midY);
              ctx.lineTo(Math.cos(nextAngle) * layerRadius, Math.sin(nextAngle) * layerRadius);
              ctx.lineTo(nextMidX, nextMidY);
              ctx.closePath();
              
              ctx.fillStyle = 'rgba(135, 206, 250, 0.3)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          
          ctx.restore();
        }
        
        // Central light orb
        const centralGlow = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius * 0.3
        );
        centralGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        centralGlow.addColorStop(0.5, 'rgba(200, 255, 255, 0.8)');
        centralGlow.addColorStop(1, 'rgba(173, 216, 230, 0.5)');
        
        ctx.fillStyle = centralGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Add pulsing effect to center
        const pulseSize = 0.1 + Math.sin(time * 3) * 0.05;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * pulseSize, 0, Math.PI * 2);
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
        
        // Only negativity (red crystals) reduce prana
        if (obstacle.name === 'negativity') {
          // Reduce prana
          reducePrana(obstacle.damage);
          
          // Show damage message
          showMessage(`-${obstacle.damage} Prana!`, player.x + player.width, player.y, '#FF5555');
        } else if (obstacle.name === 'illusion') {
          // Illusions create visual distortion but don't hurt prana
          player.velocityY = player.velocityY * -0.8; // Reverse player momentum slightly
          showMessage(`Illusion!`, player.x + player.width, player.y, '#8A2BE2');
        } else if (obstacle.name === 'attachment') {
          // Attachments slow player down temporarily
          player.velocityY = player.velocityY * 0.5; // Slow down player
          showMessage(`Attachment!`, player.x + player.width, player.y, '#800020');
        }
        
        // Add score for all obstacles
        score += obstacle.points;
        document.getElementById('score').textContent = Math.floor(score);
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
    
    // Add this to your checkCollisions function to handle boss monster collisions
    // Check collisions with boss monsters
    if (bossMonsters && bossMonsters.length > 0) {
      for (let i = bossMonsters.length - 1; i >= 0; i--) {
        const boss = bossMonsters[i];
        
        if (isColliding(player, boss)) {
          // Player takes massive damage
          reducePrana(boss.damage);
          score += boss.points; // Negative points
          
          // Visual effects
          createExplosionParticles(player.x + player.width/2, player.y + player.height/2);
          showMessage(`COSMIC DRAIN: -${boss.damage}!`, player.x, player.y - 30, '#FF0000');
          
          // Push player back
          player.velocityY = (Math.random() > 0.5 ? 1 : -1) * 5;
          
          // Push boss back slightly
          boss.x += 30;
        }
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
      
      // Save context for special effects
      ctx.save();
      
      // Handle special message types
      if (message.special === 'pulse') {
        // Pulsing effect for warning symbol
        const pulseSize = 1 + 0.2 * Math.sin(Date.now() / 100);
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 150);
        ctx.scale(pulseSize, pulseSize);
        
        // Add glow
        ctx.shadowColor = '#FF4500';
        ctx.shadowBlur = 15;
        
        // Draw the warning symbol
        ctx.fillStyle = message.color;
        ctx.font = `${message.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(message.text, message.x / pulseSize, message.y / pulseSize);
      }
      else if (message.special === 'warning') {
        // Main warning text
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 15;
        ctx.fillStyle = message.color;
        ctx.font = `bold ${message.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(Date.now() / 200);
        ctx.fillText(message.text, message.x, message.y);
        
        // Add a faint horizontal line
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(message.x - 200, message.y + 10);
        ctx.lineTo(message.x + 200, message.y + 10);
        ctx.stroke();
      }
      else if (message.special === 'elegantWarning') {
        // Elegant warning with subtle glow
        ctx.shadowColor = '#9370DB'; // Purple glow
        ctx.shadowBlur = 10;
        
        // Subtle pulsing
        const alpha = 0.7 + 0.3 * Math.sin(Date.now() / 300);
        ctx.globalAlpha = alpha;
        
        // Draw elegant text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${message.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(message.text, message.x, message.y);
        
        // Thin underline
        ctx.strokeStyle = '#9370DB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const textWidth = ctx.measureText(message.text).width;
        ctx.moveTo(message.x - textWidth/2, message.y + 5);
        ctx.lineTo(message.x + textWidth/2, message.y + 5);
        ctx.stroke();
      }
      else {
        // Regular messages or glow layers
        ctx.fillStyle = message.color || '#E6BE8A';
        ctx.font = `${message.size || 16}px Arial`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, message.life / 20);
        ctx.fillText(message.text, message.x, message.y);
      }
      
      ctx.restore();
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
    
    // Add copyright at the bottom of the canvas
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Draw the copyright text
    const copyrightText = '© 2023 Glass - Innovate. Automate. Elevate.';
    ctx.fillStyle = 'rgba(230, 190, 138, 0.7)';
    ctx.fillText(copyrightText, canvas.width / 2, canvas.height - 5);
    
    // Store the position and width of "Glass" text for click detection
    // We'll estimate it's roughly at this position
    const glassText = 'Glass';
    const fullTextWidth = ctx.measureText(copyrightText).width;
    const glassTextWidth = ctx.measureText(glassText).width;
    
    // Calculate position of "Glass" within the copyright text
    const startX = canvas.width / 2 - fullTextWidth / 2 + ctx.measureText('© 2023 ').width;
    
    // Store these values on the canvas for click detection
    canvas.glassLinkX = startX;
    canvas.glassLinkWidth = glassTextWidth;
    canvas.glassLinkY = canvas.height - 15; // Approximate vertical position
    canvas.glassLinkHeight = 12; // Font size
    
    // Optional: Draw a subtle indicator that Glass is clickable
    // Slightly different color for "Glass"
    ctx.fillStyle = '#FFD700'; // Gold color for the clickable part
    ctx.fillText(glassText, startX + glassTextWidth / 2, canvas.height - 5);
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
    ctx.fillText('Press Space or Shakti to Begin Again', canvas.width / 2, canvas.height / 2 + 80);
  }
  
  // Draw start screen - simple and elegant version
  function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFD309'; // Gold
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    // ctx.fillText('Antariksh', canvas.width / 2, canvas.height / 2 - 80);
    
    // ctx.fillStyle = '#E6BE8A'; // Light gold
    // ctx.font = '24px Arial';
    // ctx.fillText('The Cosmic Journey', canvas.width / 2, canvas.height / 2 - 40);
    
    // Instructions
    ctx.font = '16px Arial';
    ctx.fillText('Press Space or Shakti to Begin', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Hold Space or Shakti to Levitate', canvas.width / 2, canvas.height / 2 + 35);
    
    // Legend for item explanations - with smaller font
    const legendY = canvas.height / 2 + 90;
    const itemSpacing = 25; // Slightly reduced spacing
    
    // Use smaller font for legends
    ctx.font = '16px Arial'; // Reduced from 18px to 16px
    
    // Draw prana with label
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.beginPath();
    ctx.arc(canvas.width/2 - 120, legendY, 8, 0, Math.PI * 2); // Slightly smaller circle
    
    ctx.fillStyle = '#E6BE8A'; // Light gold
    ctx.textAlign = 'left';
    // ctx.fillText('- Lotus: Collect for prana', canvas.width/2 - 100, legendY + 5); // Added vertical alignment (+5)
    
    // Draw obstacle with label
    ctx.fillStyle = '#8B0000'; // Dark red
    ctx.beginPath();
    ctx.arc(canvas.width/2 - 120, legendY + itemSpacing, 8, 0, Math.PI * 2);
   
    ctx.fillStyle = '#E6BE8A'; // Light gold
    // ctx.fillText('- Negative energies: Avoid these', canvas.width/2 - 100, legendY + itemSpacing + 5);
    
    // Draw protection with label
    ctx.fillStyle = '#C2B280'; // Sand/gold
    ctx.beginPath();
    ctx.arc(canvas.width/2 - 120, legendY + itemSpacing*2, 8, 0, Math.PI * 2);
    // ctx.fill();
    // ctx.fillStyle = '#E6BE8A'; // Light gold
    // ctx.fillText('Yantras: Temporary protection', canvas.width/2 - 100, legendY + itemSpacing*2 + 5);
  }

  // Helper function to draw elegant legend icons
  function drawLegendIcon(type, x, y, size, theme) {
    ctx.save();
    
    if (type === 'prana') {
      // Draw glowing orb
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, theme.collectibles.prana[0]);
      gradient.addColorStop(0.7, theme.collectibles.prana[1]);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Center highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (type === 'negativity') {
      // Draw jagged crystal
      ctx.fillStyle = theme.obstacles.negativity[0];
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.7, y - size * 0.3);
      ctx.lineTo(x + size * 0.3, y + size * 0.8);
      ctx.lineTo(x - size * 0.5, y + size * 0.4);
      ctx.lineTo(x - size * 0.8, y - size * 0.5);
      ctx.closePath();
      ctx.fill();
      
      // Add inner details
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.3);
      ctx.lineTo(x - size * 0.3, y + size * 0.4);
      ctx.stroke();
    }
    else if (type === 'shield') {
      // Draw yantra protection symbol
      ctx.strokeStyle = theme.collectibles.prana[0];
      ctx.lineWidth = 2;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner triangle
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.7);
      ctx.lineTo(x - size * 0.6, y + size * 0.4);
      ctx.lineTo(x + size * 0.6, y + size * 0.4);
      ctx.closePath();
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Draw theme selector preview
  function drawThemeSelector(x, y) {
    const themes = Object.keys(colorThemes);
    const boxSize = 30;
    const spacing = 10;
    const totalWidth = themes.length * boxSize + (themes.length - 1) * spacing;
    
    let startX = x - totalWidth / 2;
    
    ctx.font = '14px "Quicksand", sans-serif';
    ctx.fillStyle = colorThemes[currentTheme].ui.text;
    ctx.textAlign = 'center';
    ctx.fillText('Select Theme:', x, y - 25);
    
    themes.forEach((themeName, index) => {
      const theme = colorThemes[themeName];
      const boxX = startX + index * (boxSize + spacing);
      
      // Draw theme preview box
      const gradient = ctx.createLinearGradient(boxX, y - boxSize/2, boxX + boxSize, y + boxSize/2);
      gradient.addColorStop(0, theme.background[0]);
      gradient.addColorStop(1, theme.background[1]);
      
      ctx.fillStyle = gradient;
      ctx.strokeStyle = themeName === currentTheme ? theme.ui.heading : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = themeName === currentTheme ? 3 : 1;
      
      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(boxX, y - boxSize/2, boxSize, boxSize, 5);
      ctx.fill();
      ctx.stroke();
      
      // Theme name below
      ctx.font = '12px "Quicksand", sans-serif';
      ctx.fillStyle = theme.ui.text;
      ctx.fillText(themeName.charAt(0).toUpperCase(), boxX + boxSize/2, y + 5);
    });
  }

  // Helper function to convert hex to rgb
  function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse r, g, b values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
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
        createMultipleObstacles(); // Use this instead of createObstacle()
        lastObstacleTime = timestamp;
      }
      
      // Create collectibles
      if (timestamp - lastCollectibleTime > collectibleInterval) {
        createCollectible();
        lastCollectibleTime = timestamp;
      }
      
      // Create boss monsters (less frequently)
      if (timestamp - lastBossTime > bossInterval && score > 500) { // Only spawn after score > 500
        createBossMonster();
        lastBossTime = timestamp;
      }
      
      // Update and draw obstacles
      updateAndDrawObstacles(deltaTime);
      
      // Update and draw collectibles
      updateAndDrawCollectibles(deltaTime);
      
      // Update and draw boss monsters
      updateAndDrawBossMonsters(deltaTime);
      
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
    obstacleInterval = 1500; // Decreased from original value (e.g., 2000)
    collectibleInterval = 2500;
    monsterInterval = 2500; // Decreased from original value
    bossInterval = 15000; // Decreased from 20000
    
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
    
    // Try to load saved theme
    const savedTheme = localStorage.getItem('antarikshTheme');
    if (savedTheme && colorThemes[savedTheme]) {
      currentTheme = savedTheme;
    }
    
    // Set up theme selector
    const themeSelector = document.getElementById('themeSelect');
    if (themeSelector) {
      themeSelector.value = currentTheme;
      
      // Apply initial theme
      applyTheme(currentTheme);
      
      // Set up theme change event
      themeSelector.addEventListener('change', function() {
        applyTheme(this.value);
        // Recreate stars with new theme colors
        createStars();
      });
    }
    
    // Update the instructions text to match the SHAKTI button name
    const instructionsText = document.querySelector('.controls p');
    if (instructionsText) {
      instructionsText.textContent = 'Use Space, Up Arrow, or SHAKTI button to levitate. Collect prana and avoid negative energies!';
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
  }
  
  // Start the game after defining all functions
  init();
  
  // Add fullscreen functionality
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const gameContainer = document.querySelector('.game-container');
  
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }
  
  function toggleFullscreen() {
    if (!document.fullscreenElement &&    // Standard
        !document.mozFullScreenElement && // Firefox
        !document.webkitFullscreenElement && // Chrome, Safari, Opera
        !document.msFullscreenElement) {  // IE/Edge
      
      // Enter fullscreen
      if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen();
      } else if (gameContainer.mozRequestFullScreen) {
        gameContainer.mozRequestFullScreen();
      } else if (gameContainer.webkitRequestFullscreen) {
        gameContainer.webkitRequestFullscreen();
      } else if (gameContainer.msRequestFullscreen) {
        gameContainer.msRequestFullscreen();
      }
      
      document.body.classList.add('fullscreen-game');
      fullscreenBtn.querySelector('.fullscreen-icon').innerHTML = '⤢';
      
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      
      document.body.classList.remove('fullscreen-game');
      fullscreenBtn.querySelector('.fullscreen-icon').innerHTML = '⛶';
    }
  }
  
  // Listen for fullscreen change events
  document.addEventListener('fullscreenchange', updateFullscreenUI);
  document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
  document.addEventListener('mozfullscreenchange', updateFullscreenUI);
  document.addEventListener('MSFullscreenChange', updateFullscreenUI);
  
  function updateFullscreenUI() {
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement) {
      document.body.classList.add('fullscreen-game');
      fullscreenBtn.querySelector('.fullscreen-icon').innerHTML = '⤢';
    } else {
      document.body.classList.remove('fullscreen-game');
      fullscreenBtn.querySelector('.fullscreen-icon').innerHTML = '⛶';
    }
    
    // Resize canvas to fill screen in fullscreen mode
    const canvas = document.getElementById('gameCanvas');
    if (document.fullscreenElement) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } else {
      canvas.width = 600;
      canvas.height = 400;
    }
    
    // Recreate stars after resize
    createStars();
  }
  
  // Add this after the init function to handle clicks on the Glass link
  canvas.addEventListener('click', function(event) {
    // Get the mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Check if click is on the "Glass" text
    if (canvas.glassLinkX && 
        mouseX >= canvas.glassLinkX && 
        mouseX <= canvas.glassLinkX + canvas.glassLinkWidth &&
        mouseY >= canvas.glassLinkY && 
        mouseY <= canvas.glassLinkY + canvas.glassLinkHeight) {
      
      // Open Google in a new tab
      window.open('https://www.google.com', '_blank');
    }
  });

  // Add this code after where you define other game variables
  // Define a special boss monster character
  const bossMonstersEnabled = true;
  let bossMonsters = [];
  let lastBossTime = 0;
  // const bossInterval = 15000; // Remove this line as it's already declared above

  // Function to create a boss monster
  function createBossMonster() {
    const bossMonster = {
      x: canvas.width + 100,
      y: canvas.height / 2 - 100, // Adjusted vertical position for larger size
      width: 250, // Increased from 150
      height: 250, // Increased from 150
      currentColor: '#9370DB', // Starting color (purple)
      glowColor: '#9370DB',
      velocityX: -0.7 * gameSpeed,
      velocityY: Math.sin(Date.now() / 1000) * 0.5,
      damage: 90, // Increased damage to match the larger size
      points: -400, // Increased penalty
      health: 7, // Increased health
      pulsePhase: 0,
      flowPhase: 0,
      glowPhase: 0,
      glowIntensity: 1
    };
    
    bossMonsters.push(bossMonster);
  }

  // Function to update and draw boss monsters
  function updateAndDrawBossMonsters(deltaTime) {
    if (!bossMonsters || bossMonsters.length === 0) return;
    
    for (let i = bossMonsters.length - 1; i >= 0; i--) {
      const boss = bossMonsters[i];
      
      // Update position and animations
      boss.x += boss.velocityX * (deltaTime / 16);
      boss.y += boss.velocityY * (deltaTime / 16);
      
      // Bounce off edges
      if (boss.y < 0 || boss.y + boss.height > canvas.height) {
        boss.velocityY *= -1;
        boss.y = Math.max(0, Math.min(boss.y, canvas.height - boss.height));
      }
      
      // Remove if off screen
      if (boss.x + boss.width < 0) {
        bossMonsters.splice(i, 1);
        continue;
      }
      
      // Update animation phases
      boss.pulsePhase += deltaTime / 300;
      boss.flowPhase = (boss.flowPhase || 0) + deltaTime / 400;
      boss.glowPhase = (boss.glowPhase || 0) + deltaTime / 250;
      
      // Update color cycles for a more elegant pulsing effect
      const colorPhase = Math.sin(boss.glowPhase);
      const r = 100 + 155 * Math.abs(colorPhase);
      const g = 20 + 50 * Math.abs(colorPhase);
      const b = 100 + 155 * (1 - Math.abs(colorPhase));
      boss.currentColor = `rgb(${r}, ${g}, ${b})`;
      boss.glowIntensity = 1 + 0.7 * Math.sin(boss.glowPhase * 0.7);
      
      // Draw the boss
      ctx.save();
      
      // Ethereal glow
      ctx.shadowColor = boss.currentColor;
      ctx.shadowBlur = 40 * boss.glowIntensity;
      
      // Main ethereal form - vertical oval shape
      const centerX = boss.x + boss.width/2;
      const centerY = boss.y + boss.height/2;
      const pulseFactor = 1 + 0.1 * Math.sin(boss.pulsePhase);
      
      // Create gradient for main body
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, boss.width/2 * pulseFactor
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.3, boss.currentColor);
      gradient.addColorStop(0.7, `rgba(${r/2}, ${g/2}, ${b/2}, 0.8)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      
      // Draw the elegant oval form
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.ellipse(
        centerX, centerY,
        boss.width/2.5 * pulseFactor, // horizontal radius
        boss.height/1.8 * pulseFactor, // vertical radius
        0, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Draw swirling energy tendrils
      const tendrilCount = 12;
      for (let j = 0; j < tendrilCount; j++) {
        const baseAngle = (j / tendrilCount) * Math.PI * 2;
        const flowOffset = boss.flowPhase + (j / tendrilCount) * Math.PI * 2;
        
        // Each tendril is a flowing curve
        ctx.beginPath();
        ctx.strokeStyle = boss.currentColor;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = boss.currentColor;
        
        // Create flowing curve paths
        const curve = [];
        const segments = 15;
        const length = boss.width * (0.8 + 0.3 * Math.sin(boss.pulsePhase + j * 0.5));
        
        for (let k = 0; k <= segments; k++) {
          const t = k / segments;
          const angle = baseAngle + Math.sin(flowOffset + t * 5) * 0.8;
          const dist = length * t;
          
          curve.push({
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist
          });
        }
        
        // Draw the tendril path
        ctx.beginPath();
        ctx.moveTo(curve[0].x, curve[0].y);
        
        for (let k = 1; k < curve.length; k++) {
          ctx.lineTo(curve[k].x, curve[k].y);
        }
        
        ctx.stroke();
        
        // Add particles along the tendrils
        if (Math.random() < 0.3) {
          const particleIndex = Math.floor(Math.random() * (curve.length - 1));
          const particle = {
            x: curve[particleIndex].x,
            y: curve[particleIndex].y,
            velocityX: (Math.random() - 0.5) * 2,
            velocityY: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 3,
            life: 20 + Math.random() * 20,
            color: boss.currentColor
          };
          particles.push(particle);
        }
      }
      
      // Central void/core - the "face"
      const voidGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, boss.width/4
      );
      voidGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      voidGradient.addColorStop(0.5, 'rgba(20, 0, 40, 0.8)');
      voidGradient.addColorStop(0.8, boss.currentColor);
      voidGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.fillStyle = voidGradient;
      ctx.arc(centerX, centerY, boss.width/4, 0, Math.PI * 2);
      ctx.fill();
      
      // Haunting glow effect in the center - resembling a mouth or void
      ctx.beginPath();
      const mouthWidth = boss.width/6 * (1 + 0.3 * Math.sin(boss.pulsePhase * 2));
      const mouthHeight = boss.height/12 * (1 + 0.5 * Math.abs(Math.sin(boss.pulsePhase)));
      ctx.ellipse(
        centerX, centerY + boss.height/10,
        mouthWidth, // horizontal radius
        mouthHeight, // vertical radius
        0, 0, Math.PI * 2
      );
      
      // Create gradient for the "mouth"
      const mouthGradient = ctx.createRadialGradient(
        centerX, centerY + boss.height/10, 0,
        centerX, centerY + boss.height/10, mouthWidth
      );
      mouthGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      mouthGradient.addColorStop(0.3, 'rgba(255, 100, 100, 0.8)');
      mouthGradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
      
      ctx.fillStyle = mouthGradient;
      ctx.fill();
      
      // Create a subtle energy ring
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + 0.2 * Math.sin(boss.glowPhase)})`;
      ctx.lineWidth = 8;
      ctx.arc(centerX, centerY, boss.width * 0.7 * (1 + 0.05 * Math.sin(boss.pulsePhase * 3)), 0, Math.PI * 2);
      ctx.stroke();
      
      // Add ambient particles surrounding the boss
      if (Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const distance = boss.width * (0.6 + Math.random() * 0.5);
        const px = centerX + Math.cos(angle) * distance;
        const py = centerY + Math.sin(angle) * distance;
        
        particles.push({
          x: px,
          y: py,
          velocityX: (Math.random() - 0.5) * 1,
          velocityY: (Math.random() - 0.5) * 1,
          size: 1 + Math.random() * 2,
          life: 10 + Math.random() * 30,
          color: boss.currentColor
        });
      }
      
      ctx.restore();
    }
  }

  // Replace the showGlowingWarning function with this simpler version
  function showGlowingWarning(text, x, y) {
    // Single message with subtle glow effect
    messages.push({
      text: text,
      x: x,
      y: y,
      velocityY: 0,
      life: 120,
      size: 32,
      color: '#FFFFFF', // White text
      special: 'elegantWarning'  // Tag for special rendering
    });
  }

  // Add this function somewhere near the other utility functions (before it's called)
  // This should be outside of any other function declarations but inside the DOMContentLoaded event handler

  // Helper function for collision detection
  function isColliding(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Add this function to spawn multiple obstacles at once
  function createMultipleObstacles() {
    // Create 1-3 obstacles at different heights
    const count = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
      createObstacle();
    }
  }
}); 