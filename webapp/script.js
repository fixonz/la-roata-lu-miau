// --- Lucky Wheel Logic ---

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const resultDiv = document.getElementById('result');
const spinner = document.getElementById('spinner');
const btnSpin = document.getElementById('btnSpin');
const wheelSVG = document.getElementById('wheelSVG');
const sectorsGroup = document.getElementById('sectorsGroup');

// Example: 12 sectors, you can update these to match your backend config
const sectorLabels = [
  'LOSS', 'BASE', 'LOSS', 'RARE', 'GOLD', 'LOSS',
  'RARE', 'LOSS', 'BASE', 'GOLD', 'LOSS', 'RARE'
];
// Assign a unique color to each unique label
const labelColorMap = {
  'LOSS': '#ba4d4e',
  'BASE': '#1592e8',
  'LOSS': '#14c187',
  'RARE': '#fc7800',
  'GOLD': '#ffd700'
};
const numSectors = sectorLabels.length;

// Dynamically generate SVG sectors
function createSectors() {
  sectorsGroup.innerHTML = '';
  const cx = 365, cy = 365, r = 328;
  for (let i = 0; i < numSectors; i++) {
    const startAngle = (2 * Math.PI / numSectors) * i - Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI / numSectors;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = 0;
    const pathData = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    // Use the color mapped to the label
    const label = sectorLabels[i];
    path.setAttribute('fill', labelColorMap[label] || '#ccc');
    path.setAttribute('id', `_sector${i}`);
    sectorsGroup.appendChild(path);
    // Add label
    const labelAngle = startAngle + Math.PI / numSectors;
    const labelR = r * 0.7;
    const lx = cx + labelR * Math.cos(labelAngle);
    const ly = cy + labelR * Math.sin(labelAngle) + 8;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '28');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('font-weight', 'bold');
    text.textContent = label;
    sectorsGroup.appendChild(text);
  }
}

createSectors();

function getSectorIndexByLabel(label) {
  // Find the first sector with the given label (case-insensitive)
  return sectorLabels.findIndex(l => l.toLowerCase() === label.toLowerCase());
}

async function fetchSpinResult() {
  if (!token) {
    resultDiv.innerText = 'Token lipsă. Nu putem afișa rezultatul.';
    return null;
  }
  // Replace with your backend endpoint
  const res = await fetch(`/api/spin-result?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    resultDiv.innerText = 'Eroare la obținerea rezultatului.';
    return null;
  }
  return await res.json();
}

function spinToSector(sectorIndex, onComplete) {
  // Each sector is 360/numSectors degrees
  const degPerSector = 360 / numSectors;
  // Randomize the number of full spins (3-5)
  const fullSpins = Math.floor(Math.random() * 2) + 3;
  // The wheel starts at 0deg, so to land the sector at the top (indicator), rotate so that sectorIndex is at 0deg
  const finalDeg = 360 * fullSpins - (sectorIndex * degPerSector) - degPerSector / 2;
  spinner.style.display = 'block';
  TweenMax.to('.wheel', 5, {
    rotation: finalDeg,
    transformOrigin: '50% 50%',
    ease: Power4.easeOut,
    onComplete: function() {
      spinner.style.display = 'none';
      if (onComplete) onComplete();
    }
  });
}

btnSpin.addEventListener('click', async function() {
  btnSpin.disabled = true;
  resultDiv.innerText = '';
  // Fetch backend result
  const result = await fetchSpinResult();
  if (!result) {
    btnSpin.disabled = false;
    return;
  }
  // Find the sector index for the outcome
  let sectorIndex = getSectorIndexByLabel(result.outcome || (result.prize && result.prize.name) || 'PIERDUT');
  if (sectorIndex === -1) sectorIndex = 0;
  spinToSector(sectorIndex, function() {
    let msg = '';
    if (result.type === 'WIN' && result.prize) {
      msg = `🎉 Felicitări! Ai câștigat: ${result.prize.name}<br>${result.prize.description}`;
    } else {
      msg = 'Din păcate, nu ai câștigat nimic la această rotire. Încearcă din nou!';
    }
    resultDiv.innerHTML = msg;
    btnSpin.disabled = false;
  });
}); 