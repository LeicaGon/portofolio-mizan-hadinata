const card = document.getElementById('card');
const cardHook = document.getElementById('card-hook');
const flip = document.getElementById('flip');
const tether = document.querySelector('.tether');
const resetButton = document.getElementById('reset-card');
const autoButton = document.getElementById('auto-card');
const themeToggle = document.getElementById('theme-toggle');
const scrollProgress = document.getElementById('scroll-progress');
const backToTop = document.getElementById('back-to-top');
const statusText = document.getElementById('card-status-text');
const positionText = document.getElementById('card-position');
const githubRepos = document.getElementById('github-repos');
const repoControls = document.getElementById('repo-tools');
const repoSearch = document.getElementById('repo-search');
const repoLanguage = document.getElementById('repo-language');
const repoSort = document.getElementById('repo-sort');
const repoFavorites = document.getElementById('repo-favorites');
const repoClear = document.getElementById('repo-clear');
const repoCount = document.getElementById('repo-count');
const userAge = document.getElementById('user-age');
const birthdayCountdown = document.getElementById('birthday-countdown');
const birthdayStatus = document.getElementById('birthday-status');
const birthdayHighlight = document.getElementById('birthday-highlight');
const birthdayHighlightText = document.getElementById('birthday-highlight-text');
const countdownDays = document.getElementById('countdown-days');
const countdownHours = document.getElementById('countdown-hours');
const countdownMinutes = document.getElementById('countdown-minutes');
const countdownSeconds = document.getElementById('countdown-seconds');
const spotifyFrame = document.getElementById('spotify-frame');
const spotifyStatusLabel = document.getElementById('spotify-status-label');
const spotifyNowPlaying = document.getElementById('spotify-now-playing');
const spotifyPlayerWrap = document.querySelector('.spotify-player-wrap');
const spotifyToggle = document.getElementById('spotify-toggle');
const spotifyLike = document.getElementById('spotify-like');
const spotifyProgressBar = document.getElementById('spotify-progress-bar');
const spotifyPicks = document.querySelectorAll('.spotify-pick[data-spotify-src]');
const savedRepoStorageKey = 'nara-saved-repos';
const birthDate = new Date('2010-01-04T00:00:00');
let repositories = [];
let showingFavorites = false;
let savedRepositoryIds = new Set();
try {
	const storedRepositories = JSON.parse(window.localStorage.getItem(savedRepoStorageKey) || '[]');
	if (Array.isArray(storedRepositories)) savedRepositoryIds = new Set(storedRepositories.map(String));
} catch {}

let flipped = false;
let dragging = false;
let autoPlaying = false;
let autoTimer;
let rotation = { x: 0, y: 0 };
let rotationVelocity = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let dragStart = { x: 0, y: 0 };
let startOffset = { x: 0, y: 0 };
let dragVelocity = { x: 0, y: 0 };
let lastPointer = { x: 0, y: 0, time: 0 };
let hasDragged = false;
let physicsFrame;
let physicsTime = 0;

function getMovementBounds(scene) {
	return {
		x: Math.max(70, (scene.width - card.offsetWidth) / 2 + 120),
		y: Math.max(70, (scene.height - card.offsetHeight) / 2 + 120)
	};
}

function renderCard() {
	card.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0) rotateY(${rotation.y + (flipped ? 180 : 0)}deg) rotateX(${rotation.x}deg) scale(var(--card-scale, 1))`;
	const scene = card.parentElement;
	const sceneRect = scene.getBoundingClientRect();
	const hookRect = cardHook.getBoundingClientRect();
	const anchorX = hookRect.left + hookRect.width / 2 - sceneRect.left;
	const anchorY = hookRect.top + hookRect.height / 2 - sceneRect.top;
	const startX = sceneRect.width / 2;
	const startY = 14;
	const deltaX = anchorX - startX;
	const deltaY = anchorY - startY;
	const path = `M ${startX} ${startY} C ${startX + deltaX * .18} ${startY + deltaY * .42}, ${anchorX - deltaX * .18} ${anchorY - Math.max(24, deltaY * .16)}, ${anchorX} ${anchorY}`;
	tether.setAttribute('viewBox', `0 0 ${sceneRect.width} ${sceneRect.height}`);
	tether.querySelectorAll('path').forEach(line => line.setAttribute('d', path));
	positionText.textContent = `X ${String(Math.round(offset.x)).padStart(3, '0')} / Y ${String(Math.round(offset.y)).padStart(3, '0')}`;
}

function setStatus(message) {
	statusText.textContent = message;
}

function resetPosition() {
	window.cancelAnimationFrame(physicsFrame);
	card.classList.remove('flinging');
	offset = { x: 0, y: 0 };
	velocity = { x: 0, y: 0 };
	rotation = { x: 0, y: 0 };
	rotationVelocity = { x: 0, y: 0 };
	flipped = false;
	setStatus('SIAP DILIHAT');
	renderCard();
}

function stopAutoPlay() {
	if (!autoPlaying) return;
	autoPlaying = false;
	window.clearInterval(autoTimer);
	autoButton.classList.remove('active');
	autoButton.textContent = '◌';
	setStatus('SIAP DILIHAT');
}

function toggleAutoPlay() {
	if (autoPlaying) {
		stopAutoPlay();
		return;
	}
	autoPlaying = true;
	autoButton.classList.add('active');
	autoButton.textContent = 'Ⅱ';
	setStatus('PUTAR OTOMATIS');
	autoTimer = window.setInterval(() => {
		rotation.y = rotation.y >= 180 ? -180 : rotation.y + 4;
		renderCard();
	}, 45);
}

function pointTilt(event) {
	if (dragging) {
		const scene = card.parentElement.getBoundingClientRect();
		const bounds = getMovementBounds(scene);
		const deltaX = event.clientX - dragStart.x;
		const deltaY = event.clientY - dragStart.y;
		const elapsed = Math.max(8, event.timeStamp - lastPointer.time);
		dragVelocity.x = Math.max(-1800, Math.min(1800, (event.clientX - lastPointer.x) / elapsed * 1000));
		dragVelocity.y = Math.max(-1800, Math.min(1800, (event.clientY - lastPointer.y) / elapsed * 1000));
		lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp };
		hasDragged ||= Math.hypot(deltaX, deltaY) > 5;
		offset.x = Math.max(-bounds.x, Math.min(bounds.x, startOffset.x + deltaX));
		offset.y = Math.max(-bounds.y, Math.min(bounds.y, startOffset.y + deltaY));
		rotation.y = Math.max(-32, Math.min(32, deltaX * .24));
		rotation.x = Math.max(-28, Math.min(28, -deltaY * .18));
		setStatus('TARIKAN AKTIF');
		renderCard();
		return;
	}

	const rect = card.getBoundingClientRect();
	rotation.y = ((event.clientX - rect.left) / rect.width - .5) * 18;
	rotation.x = -((event.clientY - rect.top) / rect.height - .5) * 18;
	renderCard();
}

function toggleFlip() {
	stopAutoPlay();
	flipped = !flipped;
	rotation = { x: 0, y: 0 };
	setStatus(flipped ? 'SISI BELAKANG / TENTANG' : 'SISI DEPAN / PROFIL');
	renderCard();
}

card.addEventListener('pointermove', pointTilt);
card.addEventListener('pointerleave', () => {
	if (!dragging && !autoPlaying && !card.classList.contains('flinging')) {
		rotation = { x: 0, y: 0 };
		renderCard();
	}
});
card.addEventListener('pointerdown', event => {
	stopAutoPlay();
	window.cancelAnimationFrame(physicsFrame);
	card.classList.remove('flinging');
	velocity = { x: 0, y: 0 };
	rotationVelocity = { x: 0, y: 0 };
	dragging = true;
	hasDragged = false;
	dragVelocity = { x: 0, y: 0 };
	dragStart = { x: event.clientX, y: event.clientY };
	lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp };
	startOffset = { ...offset };
	card.classList.add('dragging');
	card.setPointerCapture(event.pointerId);
});

function stopDragging(event) {
	if (!dragging) return;
	dragging = false;
	card.classList.remove('dragging');
	if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
	if (!hasDragged) {
		rotation = { x: 0, y: 0 };
		setStatus('POSISI DIKUNCI');
		renderCard();
		return;
	}
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		resetPosition();
		return;
	}
	velocity = { x: dragVelocity.x * 1.25, y: dragVelocity.y * 1.25 };
	rotationVelocity = {
		x: Math.max(-720, Math.min(720, -dragVelocity.y * .3 + offset.y * .9)),
		y: Math.max(-720, Math.min(720, dragVelocity.x * .3 - offset.x * .9))
	};
	card.classList.add('flinging');
	setStatus('KEMBALI BERAYUN');
	physicsTime = 0;
	physicsFrame = window.requestAnimationFrame(animateTether);
}

function animateTether(timestamp) {
	if (!physicsTime) physicsTime = timestamp;
	const elapsed = Math.min((timestamp - physicsTime) / 1000, .032);
	physicsTime = timestamp;
	const spring = 48;
	const damping = 3.8;
	const rotationSpring = 30;
	const rotationDamping = 2.6;
	velocity.x += (-spring * offset.x - damping * velocity.x) * elapsed;
	velocity.y += (-spring * offset.y - damping * velocity.y) * elapsed;
	offset.x += velocity.x * elapsed;
	offset.y += velocity.y * elapsed;
	rotationVelocity.x += (-rotationSpring * rotation.x - rotationDamping * rotationVelocity.x) * elapsed;
	rotationVelocity.y += (-rotationSpring * rotation.y - rotationDamping * rotationVelocity.y) * elapsed;
	rotation.x += rotationVelocity.x * elapsed;
	rotation.y += rotationVelocity.y * elapsed;
	const scene = card.parentElement.getBoundingClientRect();
	const bounds = getMovementBounds(scene);
	if (Math.abs(offset.x) > bounds.x) { offset.x = Math.sign(offset.x) * bounds.x; velocity.x *= -.62; }
	if (Math.abs(offset.y) > bounds.y) { offset.y = Math.sign(offset.y) * bounds.y; velocity.y *= -.62; }
	renderCard();
	if (Math.hypot(offset.x, offset.y, velocity.x, velocity.y, rotation.x, rotation.y, rotationVelocity.x, rotationVelocity.y) < 1.8) {
		offset = { x: 0, y: 0 };
		velocity = { x: 0, y: 0 };
		rotation = { x: 0, y: 0 };
		rotationVelocity = { x: 0, y: 0 };
		card.classList.remove('flinging');
		setStatus('SIAP DILIHAT');
		renderCard();
		return;
	}
	physicsFrame = window.requestAnimationFrame(animateTether);
}

card.addEventListener('pointerup', stopDragging);
card.addEventListener('pointercancel', stopDragging);
flip.addEventListener('pointerdown', event => event.stopPropagation());
flip.addEventListener('click', toggleFlip);
resetButton.addEventListener('click', resetPosition);
autoButton.addEventListener('click', toggleAutoPlay);
card.addEventListener('keydown', event => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		toggleFlip();
	}
	if (event.key.toLowerCase() === 'r') resetPosition();
});

function updateAge() {
	if (!userAge) return;

	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	const dayDiff = today.getDate() - birthDate.getDate();

	if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
		age -= 1;
	}

	userAge.textContent = `${age} tahun`;
}

function updateBirthdayCountdown() {
	const today = new Date();
	const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate(), 0, 0, 0);
	const nextBirthday = thisYearBirthday <= today ? new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate(), 0, 0, 0) : thisYearBirthday;
	const diffMs = nextBirthday.getTime() - today.getTime();

	if (!birthdayCountdown || !countdownDays || !countdownHours || !countdownMinutes || !countdownSeconds) return;

	if (diffMs <= 0) {
		countdownDays.textContent = '00';
		countdownHours.textContent = '00';
		countdownMinutes.textContent = '00';
		countdownSeconds.textContent = '00';
		birthdayCountdown.setAttribute('data-status', 'today');
		if (birthdayStatus) birthdayStatus.textContent = 'Selamat ulang tahun!';
		if (birthdayHighlight) birthdayHighlight.classList.add('is-birthday');
		if (birthdayHighlightText) birthdayHighlightText.textContent = 'Selamat ulang tahun!';
		return;
	}

	const totalSeconds = Math.floor(diffMs / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	countdownDays.textContent = String(days).padStart(2, '0');
	countdownHours.textContent = String(hours).padStart(2, '0');
	countdownMinutes.textContent = String(minutes).padStart(2, '0');
	countdownSeconds.textContent = String(seconds).padStart(2, '0');
	birthdayCountdown.setAttribute('data-status', 'counting');
	if (birthdayHighlight) birthdayHighlight.classList.remove('is-birthday');
	if (birthdayStatus) birthdayStatus.textContent = 'Siap menyambut hari spesial';
	if (birthdayHighlightText) birthdayHighlightText.textContent = 'Siap menyambut hari spesial';
}

themeToggle.addEventListener('click', () => {
	document.body.classList.toggle('night');
	const isNight = document.body.classList.contains('night');
	themeToggle.textContent = isNight ? '☀' : '◐';
	window.localStorage.setItem('nara-theme', isNight ? 'night' : 'day');
});
if (window.localStorage.getItem('nara-theme') === 'night') {
	document.body.classList.add('night');
	themeToggle.textContent = '☀';
}
updateAge();
updateBirthdayCountdown();
window.setInterval(() => {
	updateAge();
	updateBirthdayCountdown();
}, 1000);

let spotifyTransitionTimer;
let spotifyIsPaused = false;

function setSpotifyPlaybackState(paused) {
	spotifyIsPaused = paused;
	if (spotifyToggle) {
		spotifyToggle.textContent = paused ? 'Play' : 'Pause';
		spotifyToggle.classList.toggle('is-paused', paused);
		spotifyToggle.setAttribute('aria-label', paused ? 'Putar musik' : 'Jeda pemutar musik');
	}
	if (spotifyPlayerWrap) {
		spotifyPlayerWrap.classList.toggle('is-paused', paused);
	}
	if (!spotifyFrame || !spotifyFrame.contentWindow) return;
	if (String(spotifyFrame.src).includes('youtube.com/embed')) {
		const action = paused ? 'pauseVideo' : 'playVideo';
		spotifyFrame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: action, args: [] }), '*');
	}
}

spotifyToggle?.addEventListener('click', () => {
	setSpotifyPlaybackState(!spotifyIsPaused);
});

spotifyLike?.addEventListener('click', () => {
	const isLiked = spotifyLike.classList.toggle('is-liked');
	spotifyLike.setAttribute('aria-pressed', String(isLiked));
	spotifyLike.textContent = isLiked ? '♥' : '♡';
	spotifyLike.setAttribute('aria-label', isLiked ? 'Hapus dari favorit' : 'Tambah ke favorit');
});

if (spotifyProgressBar) {
	const progressValues = ['62%', '74%', '81%', '88%', '72%'];
	let progressIndex = 0;
	setInterval(() => {
		progressIndex = (progressIndex + 1) % progressValues.length;
		spotifyProgressBar.style.width = progressValues[progressIndex];
	}, 2200);
}

spotifyPicks.forEach(pick => {
	pick.addEventListener('click', () => {
		if (pick.disabled) return;
		const source = pick.dataset.spotifySrc || '';
		const title = pick.dataset.spotifyTitle || 'Spotify';
		if (!source || !/\/embed\//.test(source)) {
			window.open(source || 'https://open.spotify.com/search/Ours%20to%20Keep%20Kendis%20Adis', '_blank', 'noopener,noreferrer');
			return;
		}
		if (spotifyPlayerWrap) {
			spotifyPlayerWrap.classList.remove('is-switching');
			void spotifyPlayerWrap.offsetWidth;
			spotifyPlayerWrap.classList.add('is-switching');
			clearTimeout(spotifyTransitionTimer);
			spotifyTransitionTimer = setTimeout(() => {
				spotifyPlayerWrap.classList.remove('is-switching');
			}, 380);
		}
		spotifyFrame.src = source;
		spotifyFrame.title = `${title} di Spotify`;
		if (spotifyStatusLabel) spotifyStatusLabel.textContent = 'Now Playing';
		if (spotifyNowPlaying) spotifyNowPlaying.textContent = title;
		setSpotifyPlaybackState(false);
		spotifyPicks.forEach(option => {
			const isSelected = option === pick;
			option.classList.toggle('active', isSelected);
			option.setAttribute('aria-pressed', String(isSelected));
		});
	});
});

let scrollFrame;
function updateScrollControls() {
	scrollFrame = undefined;
	const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
	const progress = scrollableHeight > 0 ? Math.round(window.scrollY / scrollableHeight * 100) : 0;
	scrollProgress.style.transform = `scaleX(${progress / 100})`;
	scrollProgress.setAttribute('aria-valuenow', String(progress));
	backToTop.hidden = window.scrollY < 480;
}

window.addEventListener('scroll', () => {
	if (scrollFrame === undefined) scrollFrame = window.requestAnimationFrame(updateScrollControls);
}, { passive: true });
window.addEventListener('resize', updateScrollControls);
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
updateScrollControls();

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
	if (entry.isIntersecting) {
		entry.target.classList.add('is-visible');
		revealObserver.unobserve(entry.target);
	}
}), { threshold: .14 });
const revealTargets = document.querySelectorAll('.section-head, .github-repo, .skill-group, .education-item, .timeline-entry, .contact-copy, .coding-caption');
revealTargets.forEach((target, index) => {
	target.style.transitionDelay = `${index % 3 * 100}ms`;
	revealObserver.observe(target);
});

const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const navObserver = new IntersectionObserver(entries => {
	const activeEntry = entries.find(entry => entry.isIntersecting);
	if (!activeEntry) return;
	sectionLinks.forEach(link => {
		if (link.hash === `#${activeEntry.target.id}`) link.setAttribute('aria-current', 'location');
		else link.removeAttribute('aria-current');
	});
	}, { rootMargin: '-45% 0px -45% 0px' });
sectionLinks.forEach(link => {
	const section = document.querySelector(link.hash);
	if (section) navObserver.observe(section);
});

function renderGithubRepos() {
	const query = repoSearch.value.trim().toLocaleLowerCase();
	const selectedLanguage = repoLanguage.value;
	const filteredRepositories = repositories.filter(repository => {
		const searchText = `${repository.name} ${repository.description || ''} ${repository.language || ''}`.toLocaleLowerCase();
		return searchText.includes(query)
			&& (!selectedLanguage || repository.language === selectedLanguage)
			&& (!showingFavorites || savedRepositoryIds.has(String(repository.id)));
	});

	if (repoSort.value === 'stars') filteredRepositories.sort((a, b) => b.stargazers_count - a.stargazers_count);
	else if (repoSort.value === 'name') filteredRepositories.sort((a, b) => a.name.localeCompare(b.name));
	else filteredRepositories.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

	repoCount.textContent = `${filteredRepositories.length} dari ${repositories.length} repositori`;
	githubRepos.replaceChildren();
	if (!filteredRepositories.length) {
		const emptyState = document.createElement('p');
		emptyState.className = 'github-state';
		emptyState.textContent = showingFavorites ? 'Belum ada repositori favorit.' : 'Tidak ada repositori yang cocok.';
		githubRepos.append(emptyState);
		return;
	}

	filteredRepositories.forEach((repository, index) => {
		const card = document.createElement('article');
		card.className = 'github-repo';
		card.style.transitionDelay = `${index % 6 * 65}ms`;

		const headingRow = document.createElement('div');
		headingRow.className = 'github-repo-head';
		const title = document.createElement('h3');
		const link = document.createElement('a');
		link.href = repository.html_url;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		link.textContent = repository.name;
		title.append(link);
		const isSaved = savedRepositoryIds.has(String(repository.id));
		const saveButton = document.createElement('button');
		saveButton.className = 'repo-save';
		saveButton.type = 'button';
		saveButton.dataset.repoId = String(repository.id);
		saveButton.setAttribute('aria-label', isSaved ? 'Hapus dari favorit' : 'Simpan ke favorit');
		saveButton.setAttribute('aria-pressed', String(isSaved));
		saveButton.title = isSaved ? 'Hapus dari favorit' : 'Simpan ke favorit';
		saveButton.textContent = isSaved ? '★' : '☆';
		headingRow.append(title, saveButton);

		const description = document.createElement('p');
		description.textContent = repository.description || 'Repositori publik tanpa deskripsi.';
		const metadata = document.createElement('div');
		metadata.className = 'github-repo-meta';
		if (repository.language) {
			const language = document.createElement('span');
			language.className = 'repo-language';
			const languageDot = document.createElement('i');
			languageDot.setAttribute('aria-hidden', 'true');
			language.append(languageDot, document.createTextNode(repository.language));
			metadata.append(language);
		}
		const stars = document.createElement('span');
		stars.textContent = `★ ${repository.stargazers_count}`;
		const forks = document.createElement('span');
		forks.textContent = `⑂ ${repository.forks_count}`;
		metadata.append(stars, forks);
		card.append(headingRow, description, metadata);
		githubRepos.append(card);
		revealObserver.observe(card);
	});
}

repoSearch.addEventListener('input', renderGithubRepos);
repoLanguage.addEventListener('change', renderGithubRepos);
repoSort.addEventListener('change', renderGithubRepos);
repoFavorites.addEventListener('click', () => {
	showingFavorites = !showingFavorites;
	repoFavorites.setAttribute('aria-pressed', String(showingFavorites));
	repoFavorites.classList.toggle('active', showingFavorites);
	repoFavorites.textContent = showingFavorites ? '★ Favorit' : '☆ Favorit';
	renderGithubRepos();
});
repoClear.addEventListener('click', () => {
	repoSearch.value = '';
	repoLanguage.value = '';
	repoSort.value = 'updated';
	showingFavorites = false;
	repoFavorites.setAttribute('aria-pressed', 'false');
	repoFavorites.classList.remove('active');
	repoFavorites.textContent = '☆ Favorit';
	renderGithubRepos();
	repoSearch.focus();
});
githubRepos.addEventListener('click', event => {
	const saveButton = event.target.closest('.repo-save');
	if (!saveButton) return;
	const repositoryId = saveButton.dataset.repoId;
	if (savedRepositoryIds.has(repositoryId)) savedRepositoryIds.delete(repositoryId);
	else savedRepositoryIds.add(repositoryId);
	try {
		window.localStorage.setItem(savedRepoStorageKey, JSON.stringify([...savedRepositoryIds]));
	} catch {}
	renderGithubRepos();
});

async function loadGithubRepos() {
	try {
		const response = await fetch('https://api.github.com/users/Leica44/repos?sort=updated&per_page=30', {
			headers: { Accept: 'application/vnd.github+json' }
		});
		if (!response.ok) throw new Error('GitHub API response error');
		repositories = (await response.json()).filter(repository => !repository.fork && !repository.archived);
		const languages = [...new Set(repositories.map(repository => repository.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
		repoLanguage.replaceChildren(new Option('Semua bahasa', ''));
		languages.forEach(language => repoLanguage.add(new Option(language, language)));
		repoControls.hidden = false;
		repoCount.hidden = false;
		renderGithubRepos();
	} catch {
		repoControls.hidden = true;
		repoCount.hidden = true;
		const message = document.createElement('p');
		message.className = 'github-state';
		message.append('Repositori belum bisa dimuat. ', document.createTextNode('Kunjungi '));
		const profileLink = document.createElement('a');
		profileLink.href = 'https://github.com/Leica44';
		profileLink.target = '_blank';
		profileLink.rel = 'noopener noreferrer';
		profileLink.textContent = 'profil GitHub';
		message.append(profileLink, document.createTextNode(' untuk melihat proyek.'));
		githubRepos.replaceChildren(message);
	}
}

loadGithubRepos();

renderCard();
