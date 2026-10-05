const delay = ms =>
  new Promise(resolve => {
    setTimeout(() => resolve(ms), ms);
  });

const users = [
  { name: 'Mango', active: true },
  { name: 'Poly', active: false },
  { name: 'Ajax', active: true },
  { name: 'Lux', active: false },
];

const toggleUserState = (allUsers, userName) => {
  const updatedUsers = allUsers.map(user =>
    user.name === userName ? { ...user, active: !user.active } : user,
  );

  return Promise.resolve(updatedUsers);
};

const randomIntegerFromInterval = (min, max) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const makeTransaction = transaction => {
  const processingTime = randomIntegerFromInterval(200, 500);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const canProcess = Math.random() > 0.3;

      if (canProcess) {
        resolve({ id: transaction.id, time: processingTime });
      } else {
        reject(transaction.id);
      }
    }, processingTime);
  });
};

const logger = time => console.log(`Resolved after ${time}ms`);
const logUsers = updatedUsers => console.table(updatedUsers);
const logSuccess = ({ id, time }) =>
  console.log(`Transaction ${id} processed in ${time}ms`);
const logError = id =>
  console.warn(`Error processing transaction ${id}. Please try again later.`);

if (typeof window !== 'undefined') {
  delay(2000).then(logger);
  delay(1000).then(logger);
  delay(1500).then(logger);

  toggleUserState(users, 'Mango').then(logUsers);
  toggleUserState(users, 'Lux').then(logUsers);

  makeTransaction({ id: 70, amount: 150 })
    .then(logSuccess)
    .catch(logError);

  makeTransaction({ id: 71, amount: 230 })
    .then(logSuccess)
    .catch(logError);

  makeTransaction({ id: 72, amount: 75 })
    .then(logSuccess)
    .catch(logError);

  makeTransaction({ id: 73, amount: 100 })
    .then(logSuccess)
    .catch(logError);
}

if (typeof module !== 'undefined') {
  module.exports = { delay, toggleUserState, makeTransaction };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const apiKeyForm = document.querySelector('#api-key-form');

  if (apiKeyForm) {
    const apiKeyInput = document.querySelector('#api-key');
    const gallery = document.querySelector('#gallery');
    const status = document.querySelector('#status');
    const loadMoreButton = document.querySelector('#load-more');
    const pageCount = document.querySelector('#page-count');
    const perPage = 12;
    const apiKeyStorage = 'pixabay-api-key';
    const pageStorage = 'pixabay-editor-page';
    let apiKey = localStorage.getItem(apiKeyStorage) || '';
    let currentPage = 0;
    let totalPages = Infinity;
    let isLoading = false;

    apiKeyInput.value = apiKey;

    const setStatus = (message, isError = false) => {
      status.textContent = message;
      status.dataset.error = String(isError);
    };

    const renderImages = images => {
      const fragment = document.createDocumentFragment();

      images.forEach(image => {
        const card = document.createElement('article');
        card.className = 'image-card';

        const link = document.createElement('a');
        link.className = 'image-link';
        link.href = image.largeImageURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `Відкрити зображення автора ${image.user} у повному розмірі`);

        const img = document.createElement('img');
        img.src = image.webformatURL;
        img.alt = image.tags || 'Зображення Pixabay';
        img.loading = 'lazy';
        img.width = image.imageWidth;
        img.height = image.imageHeight;
        link.append(img);

        const caption = document.createElement('div');
        caption.className = 'image-caption';
        const user = document.createElement('span');
        user.className = 'image-user';
        user.textContent = image.user;
        const likes = document.createElement('span');
        likes.textContent = `${image.likes} вподобань`;
        caption.append(user, likes);
        card.append(link, caption);
        fragment.append(card);
      });

      gallery.append(fragment);
    };

    const fetchPage = async page => {
      const params = new URLSearchParams({
        key: apiKey,
        editors_choice: 'true',
        image_type: 'photo',
        safesearch: 'true',
        per_page: String(perPage),
        page: String(page),
      });
      const response = await fetch(`https://pixabay.com/api/?${params}`);

      if (!response.ok) {
        throw new Error(`Помилка запиту: ${response.status}`);
      }

      return response.json();
    };

    const loadPage = async (page, isRestore = false) => {
      if (isLoading || !apiKey || page > totalPages) return;

      isLoading = true;
      loadMoreButton.disabled = true;
      setStatus(isRestore ? 'Відновлюємо збережену сторінку…' : 'Завантажуємо зображення…');

      try {
        const data = await fetchPage(page);
        totalPages = Math.min(Math.ceil(data.totalHits / perPage), Math.ceil(500 / perPage));
        renderImages(data.hits);
        currentPage = page;
        localStorage.setItem(pageStorage, String(currentPage));
        pageCount.textContent = `Сторінка ${currentPage}`;
        loadMoreButton.hidden = currentPage >= totalPages || data.hits.length === 0;
        setStatus(data.hits.length ? `Зображень завантажено: ${gallery.children.length}` : 'Більше зображень немає.');
      } catch (error) {
        setStatus('Не вдалося завантажити зображення. Перевірте API-ключ і спробуйте ще раз.', true);
        loadMoreButton.hidden = currentPage === 0;
        console.error(error);
      } finally {
        isLoading = false;
        loadMoreButton.disabled = false;
      }
    };

    const restoreGallery = async () => {
      const savedPage = Number.parseInt(localStorage.getItem(pageStorage) || '1', 10);
      const pageToRestore = Number.isInteger(savedPage) && savedPage > 0 ? savedPage : 1;

      for (let page = 1; page <= pageToRestore; page += 1) {
        await loadPage(page, page < pageToRestore);
        if (currentPage !== page) break;
      }
    };

    apiKeyForm.addEventListener('submit', event => {
      event.preventDefault();
      apiKey = apiKeyInput.value.trim();
      if (!apiKey) return;

      localStorage.setItem(apiKeyStorage, apiKey);
      localStorage.setItem(pageStorage, '1');
      gallery.replaceChildren();
      currentPage = 0;
      totalPages = Infinity;
      pageCount.textContent = '';
      restoreGallery();
    });

    loadMoreButton.addEventListener('click', () => loadPage(currentPage + 1));

    if (apiKey) {
      restoreGallery();
    }
  }
}
