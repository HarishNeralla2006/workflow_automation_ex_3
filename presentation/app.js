// Presentation Deck Interactive Navigation Logic

document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const slideCounter = document.getElementById('slideCounter');
  const progressBar = document.getElementById('progressBar');
  const projectBadge = document.getElementById('projectBadge');
  const dotsNav = document.getElementById('dotsNav');

  let currentIndex = 0;
  const totalSlides = slides.length;

  // Build pagination dots
  dotsNav.innerHTML = '';
  slides.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = `dot ${idx === 0 ? 'active' : ''}`;
    dot.title = `Go to slide ${idx + 1}`;
    dot.addEventListener('click', () => goToSlide(idx));
    dotsNav.appendChild(dot);
  });

  const dots = document.querySelectorAll('.dot');

  const categoryLabels = {
    intro: { text: 'Overview', class: 'tag-intro' },
    p1: { text: 'Project 1: Student Approval', class: 'tag-p1' },
    p2: { text: 'Project 2: Loan Origination', class: 'tag-p2' },
    matrix: { text: 'Architectural Synthesis', class: 'tag-intro' }
  };

  function updateSlide(index) {
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === index);
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
    });

    // Update Counter
    slideCounter.textContent = `${index + 1} / ${totalSlides}`;

    // Update Progress Bar
    const progressPercent = ((index + 1) / totalSlides) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Update Project Badge
    const activeSlide = slides[index];
    const cat = activeSlide.getAttribute('data-category') || 'intro';
    const config = categoryLabels[cat] || categoryLabels.intro;

    projectBadge.className = `project-tag ${config.class}`;
    projectBadge.innerHTML = `<span>${config.text}</span>`;

    // Button states
    btnPrev.disabled = index === 0;
    btnNext.disabled = index === totalSlides - 1;
    btnPrev.style.opacity = index === 0 ? '0.4' : '1';
    btnNext.style.opacity = index === totalSlides - 1 ? '0.4' : '1';
  }

  function goToSlide(index) {
    if (index >= 0 && index < totalSlides) {
      currentIndex = index;
      updateSlide(currentIndex);
    }
  }

  function nextSlide() {
    if (currentIndex < totalSlides - 1) {
      currentIndex++;
      updateSlide(currentIndex);
    }
  }

  function prevSlide() {
    if (currentIndex > 0) {
      currentIndex--;
      updateSlide(currentIndex);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // Event Listeners
  btnNext.addEventListener('click', nextSlide);
  btnPrev.addEventListener('click', prevSlide);
  btnFullscreen.addEventListener('click', toggleFullscreen);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        prevSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(totalSlides - 1);
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
    }
  });

  // Initialize
  updateSlide(0);
});
