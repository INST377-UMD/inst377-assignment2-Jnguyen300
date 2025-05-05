(async function() {
  const page = document.body.dataset.page;

  window.toggleAudio = (on) =>
    annyang && (on ? annyang.start() : annyang.abort());

  if (annyang) {
    annyang.addCommands({
      hello: () => alert('Hello World'),
      'change the color to *c': (c) => document.body.style.background = c,
      'navigate to *p': (p) => location.href = `${p.toLowerCase()}.html`,
      'load dog breed *b': (b) => {
        const name = b.trim().toLowerCase();
        const btns = document.querySelectorAll('#breedButtons button');
        const btn = Array.from(btns).find(
          (el) => el.textContent.trim().toLowerCase() === name
        );
        if (btn) btn.click();
        else alert(`Breed "${b}" not found.`);
      },
      'lookup *stk': (stk) => {
        if (page === 'stocks') {
          const tIn = document.getElementById('tickerInput');
          const rSel = document.getElementById('rangeSelect');
          const btn = document.getElementById('lookupBtn');
          tIn.value = stk.trim().toUpperCase();
          rSel.value = '30';
          btn.click();
        }
      }
    });
  }

  if (page === 'home') {
    document.getElementById('btnStocks').onclick = () =>
      location.href = 'stocks.html';
    document.getElementById('btnDogs').onclick = () =>
      location.href = 'dogs.html';

    const q = await (await fetch('https://api.quotable.io/random')).json();
    document.getElementById('quote').textContent =
      `"${q.content}" — ${q.author}`;
  }

  if (page === 'stocks') {
    const tickerInput = document.getElementById('tickerInput');
    const rangeSelect = document.getElementById('rangeSelect');
    const lookupBtn = document.getElementById('lookupBtn');
    const ctx = document.getElementById('stockChart').getContext('2d');
    let chart;

    tickerInput.maxLength = 5;
    tickerInput.addEventListener('input', () => {
      tickerInput.value =
        tickerInput.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5);
    });

    const POLY_KEY = 'cEvA5oB2sTT5F40sIGRuz7GemmtPwUga';

    function formatDate(ms) {
      return new Date(ms).toLocaleDateString();
    }

    async function fetchAndDraw(ticker, days) {
      const to = new Date();
      const from = new Date(to - days * 86400000);
      const fromISO = from.toISOString().split('T')[0];
      const toISO = to.toISOString().split('T')[0];

      const url =
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/` +
        `${fromISO}/${toISO}?adjusted=true&sort=asc&limit=5000&apiKey=${POLY_KEY}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Polygon API error ${res.status}`);
      const json = await res.json();

      const labels = json.results.map((r) => formatDate(r.t));
      const data = json.results.map((r) => r.c);

      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: `${ticker} Close`,
            data,
            fill: false
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Price (USD)' } }
          }
        }
      });
    }

    async function fetchRedditTop5() {
      const resp = await fetch(
        'https://tradestie.com/api/v1/apps/reddit?date=2022-04-03'
      );
      if (!resp.ok) throw new Error(`Reddit API error: ${resp.status}`);
      const arr = await resp.json();
      const top5 = arr.slice(0, 5);

      const tbody = document.querySelector('#redditTable tbody');
      tbody.innerHTML = '';
      if (!top5.length) {
        tbody.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
        return;
      }

      top5.forEach((item) => {
        const emot = item.sentiment === 'Bullish' ? '↗' : '↘';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><a href="https://finance.yahoo.com/quote/${item.ticker}" target="_blank">
            ${item.ticker}
          </a></td>
          <td>${item.no_of_comments}</td>
          <td>${emot}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    lookupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const t = tickerInput.value.trim();
      const d = +rangeSelect.value;
      if (!t) return alert('Enter a ticker');
      fetchAndDraw(t, d).catch((err) => alert(err));
    });

    fetchRedditTop5();
  }

  if (page === 'dogs') {
    const slideResp = await fetch('https://dog.ceo/api/breeds/image/random/10');
    const slideImages = (await slideResp.json()).message;
    let idx = 0;
    const imgEl = document.getElementById('slideImage');
    document.getElementById('prevBtn').onclick = () => {
      idx = (idx - 1 + slideImages.length) % slideImages.length;
      imgEl.src = slideImages[idx];
    };
    document.getElementById('nextBtn').onclick = () => {
      idx = (idx + 1) % slideImages.length;
      imgEl.src = slideImages[idx];
    };
    imgEl.src = slideImages[0];

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    let url = 'https://dogapi.dog/api/v2/breeds';
    const allBreeds = [];
    while (url) {
      const resp = await fetch(url);
      const json = await resp.json();
      allBreeds.push(...json.data);
      url = json.links.next;
    }

    shuffle(allBreeds);
    const breeds = allBreeds.slice(0, 10);

    const container = document.getElementById('breedButtons');
    const infoEl = document.getElementById('breedInfo');
    container.innerHTML = '';
    infoEl.style.display = 'none';

    breeds.forEach((item) => {
      const { name, description, life } = item.attributes;
      const btn = document.createElement('button');
      btn.className = 'button-85';
      btn.textContent = name;
      btn.onclick = () => {
        infoEl.innerHTML = `
          <h3>${name}</h3>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Min Life Span:</strong> ${life.min} years</p>
          <p><strong>Max Life Span:</strong> ${life.max} years</p>
        `;
        infoEl.style.display = 'block';
      };
      container.appendChild(btn);
    });
  }
})();
