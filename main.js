const idPrefix = 'ba46a8d5-2dfd-4080-898d-d66896f76958'; // 他の id との衝突防止

const debounce = (f, wait) => {
  let timer;
  return (...args) => {
    timer && clearTimeout(timer);
    timer = setTimeout(() => f(...args), wait);
  };
};

// [[第1節,タイム], [第2節,タイム], ...]
const getRecords = (rows) =>
  rows
    .map((row) => [
      row.querySelectorAll('td')[0].innerText,
      parseFloat(row.querySelectorAll('td')[3].innerText, 10),
    ])
    .reverse();

const addScriptTag = (innerText) => {
  const $script = document.createElement('script');
  $script.innerText = innerText;
  document.head.appendChild($script);
};
const createGraph = debounce(() => {
  // トリコンが読み込んでいるc3を使いたいので、scriptタグを埋めてc3.generateを呼び出している
  addScriptTag(
    [...document.querySelectorAll('.result')].reduce((acc, $result, i) => {
      const rows = $result.querySelectorAll('tbody tr');
      const records = getRecords([...rows]);

      // グラフ描画用のdivを埋め込む
      const id = `${idPrefix}_chart_${i}`;
      $result?.insertAdjacentHTML(
        'afterend',
        `<div id="${id}" class="${idPrefix}-graph"></div>`
      );

      return `${acc}
  c3.generate(${JSON.stringify({
    bindto: `#${id}`,
    data: {
      columns: [['time', ...records.map(([, x]) => x)]],
    },
    axis: {
      x: {
        type: 'category',
        categories: records.map(([x]) => x),
      },
    },
  })});`;
    }, '')
  );
  observerToCreateGraph.disconnect();
}, 100);

const createPastSeasonGraph = debounce(() => {
  if (
    document.querySelectorAll('div[ng-show="isShownPastSeason"] .result')
      .length === 0
  ) {
    return;
  }
  observerForPastSeason.disconnect();
  // トリコンが読み込んでいるc3を使いたいので、scriptタグを埋めてc3.generateを呼び出している
  addScriptTag(
    [
      ...document.querySelectorAll('div[ng-show="isShownPastSeason"] .result'),
    ].reduce((acc, $result, i) => {
      const rows = $result.querySelectorAll('tbody tr');
      const records = getRecords([...rows]);

      // グラフ描画用のdivを埋め込む
      const id = `${idPrefix}_past_chart_${i}`;
      $result?.insertAdjacentHTML(
        'afterend',
        `<div id="${id}" class="${idPrefix}-graph"></div>`
      );

      return `${acc}
  c3.generate(${JSON.stringify({
    bindto: `#${id}`,
    data: {
      columns: [['time', ...records.map(([, x]) => x)]],
    },
    axis: {
      x: {
        type: 'category',
        categories: records.map(([x]) => x),
      },
    },
  })});`;
    }, '')
  );
  setTimeout(startObservingPastSeason, 100);
}, 100);

const observerToCreateGraph = new MutationObserver(() => {
  if (document.querySelectorAll('.result').length === 0) {
    return;
  }
  createGraph();
});
const mainArea = '#main-content div[ng-show="existsUser && !suspendedUser"]';

const observerForPastSeason = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (
      mutation.type === 'childList' &&
      (mutation.target.closest(`.${idPrefix}-graph`) ||
        mutation.addedNodes[0]?.closest(`.${idPrefix}-graph`))
    ) {
      // 追加されたのがグラフ関係だったら無視する
      continue;
    }
    createPastSeasonGraph();
    break;
  }
});
const startObservingPastSeason = () => {
  observerForPastSeason.observe(
    document.querySelector(`${mainArea} div[ng-show="isShownPastSeason"]`),
    {
      attributes: false,
      childList: true,
      subtree: true,
    }
  );
};

// 基本方針:トリコンの記録がロード完了した瞬間にグラフを描画したい！
// というわけで、MutationObserver を使って記録が追加されたタイミングを取得している。
// debounce 挟んでDOM更新が収まったタイミングでグラフを描画するようにした。
// ほんとは「記録が追加された瞬間に」グラフを描画したほうがいいんだろうけど、記録が追加されたかどうかはDOMを見るしかなくて、そうなるとトリコンのDOM構造が変更されたとき追従しなくちゃいけなくなる。
// ので、大雑把に「DOMが更新されたか」だけ見て記録が表示された瞬間を計っている。

observerToCreateGraph.observe(document.querySelector(mainArea), {
  attributes: false,
  childList: true,
  subtree: true,
});
startObservingPastSeason();
