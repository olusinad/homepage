const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let particles = [];
let brushColor = "white";
let isRainbow = true;
let hue = 0;

function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;  
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function resizeCanvas(){
    canvas.width = Math.min(window.innerWidth-40, 800);
    canvas.height = 600;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];  
}
document.getElementById('clear-btn').addEventListener('click', clearCanvas);

document.getElementById('color-picker').addEventListener('input', (e) => {
    brushColor = e.target.value;
    isRainbow = false;
});

class Particle {
    constructor(x,y, color = `hsl(${Math.random() * 360}, 70%, 50%)`){
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.color = color; 
        this.life = 100; 
    }
    update(){
        this.life -= 1;
        this.size *= 0.99;
    }
    draw(){
        ctx.globalAlpha = this.life / 100;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

canvas.addEventListener('mousedown', (e) =>{
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.strokeStyle = brushColor;  
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
})
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (isRainbow){
        hue = (hue + 1) % 360;  
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    }
    else{
        ctx.strokeStyle = brushColor;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    particles.push(new Particle(x, y, ctx.strokeStyle));
});

canvas.addEventListener('mouseup', ()=>{
    isDrawing = false;
    ctx.beginPath();
})

document.addEventListener('DOMContentLoaded', () => {
    const movingWordsElement = document.getElementById('moving-words');
    if (!movingWordsElement) return;
    let isDragging = false;
    let offsetX, offsetY;

    movingWordsElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        movingWordsElement.classList.add('dragging');
        
        const rect = movingWordsElement.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        e.preventDefault();  
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        movingWordsElement.style.left = `${e.clientX - offsetX}px`;
        movingWordsElement.style.top = `${e.clientY - offsetY}px`;
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            movingWordsElement.classList.remove('dragging');
        }
    });
});

function animate() {
    ctx.fillStyle = 'rgba(17, 17, 17, 0.1)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    if (Math.random() < 0.01) { 
        particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
    }
    
    requestAnimationFrame(animate);
}
animate();