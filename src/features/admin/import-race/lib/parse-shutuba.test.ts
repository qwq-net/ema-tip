import { describe, expect, it } from 'vitest';
import { parseShutuba } from './parse-shutuba';

const SOURCE_URL = 'https://race.netkeiba.com/race/shutuba.html?race_id=202505021211';

/**
 * netkeiba 出馬表ページの実マークアップを縮めた検証用 HTML を組み立てる。
 * 引数の行文字列を tr.HorseList の並びとしてそのまま埋め込む。
 */
function buildShutuba(rows: string): string {
  return `<html><body>
    <div class="RaceList_NameBox">
      <div class="RaceName">東京優駿</div>
      <div class="RaceData01">15:40発走 / 芝2400m (左) / 天候:晴 / 馬場:良</div>
    </div>
    <table class="Shutuba_Table"><tbody>${rows}</tbody></table>
  </body></html>`;
}

// 1 番人気の通常出走馬。枠番は span 入り、馬名は a の title 属性、騎手は a で入る
const NORMAL_ROW = `<tr class="HorseList">
  <td class="Waku1 Txt_C"><span>1</span></td>
  <td class="Umaban1 Txt_C">1</td>
  <td class="Txt_C"><span class="Mark"></span></td>
  <td class="HorseInfo">
    <span class="HorseName"><a href="https://db.netkeiba.com/horse/2021104000" title="ダノンデサイル" target="_blank">ダノンデサ...</a></span>
  </td>
  <td class="Barei Txt_C">牡3</td>
  <td class="Txt_C">57.0</td>
  <td class="Jockey"><a href="https://db.netkeiba.com/jockey/result/recent/01088/" title="横山典弘">横山典</a></td>
  <td class="Txt_C">美浦</td>
  <td class="Txt_C Weight">486<small>(+4)</small></td>
  <td class="Popular Txt_C"><span id="odds-1_01" class="Odds_Ninki">3.4</span></td>
  <td class="Popular Txt_C"><span id="ninki-1_01">1</span></td>
</tr>`;

// 取消馬。枠番は span なしの直書き、馬名の a に title が無く、騎手の a 自体が存在しない
const SCRATCHED_ROW = `<tr class="HorseList">
  <td class="Waku2 Txt_C">2</td>
  <td class="Umaban2 Txt_C">2</td>
  <td class="Txt_C"><span class="Mark"></span></td>
  <td class="HorseInfo">
    <span class="HorseName"><a href="https://db.netkeiba.com/horse/2021103000" target="_blank">シンエンペラー</a></span>
  </td>
  <td class="Barei Txt_C">牝4</td>
  <td class="Txt_C">55.0</td>
  <td class="Jockey"><span class="Cancel_Txt">取消</span></td>
  <td class="Txt_C">栗東</td>
  <td class="Txt_C Weight">--</td>
  <td class="Popular Txt_C"><span id="odds-1_02" class="Odds_Ninki">--</span></td>
</tr>`;

// 騎手未定。a 要素はあるが中身が空で、要素そのものが無い取消馬と区別される
const EMPTY_JOCKEY_ROW = `<tr class="HorseList">
  <td class="Waku3 Txt_C"><span>3</span></td>
  <td class="Umaban3 Txt_C">3</td>
  <td class="HorseInfo">
    <span class="HorseName"><a href="https://db.netkeiba.com/horse/2021102000" title="レガレイラ">レガレイラ</a></span>
  </td>
  <td class="Barei Txt_C">セ5</td>
  <td class="Txt_C">58.0</td>
  <td class="Jockey"><a href="https://db.netkeiba.com/jockey/result/recent/01126/"></a></td>
  <td class="Popular Txt_C"><span id="odds-1_03" class="Odds_Ninki">12.7</span></td>
</tr>`;

describe('parseShutuba', () => {
  it('レース情報を URL とページ見出しから組み立てる', () => {
    const { raceInfo, sourceUrl } = parseShutuba(buildShutuba(NORMAL_ROW), SOURCE_URL);

    expect(raceInfo).toEqual({
      raceName: '東京優駿',
      distance: 2400,
      surface: '芝',
      direction: 'LEFT',
      condition: '良',
      raceNumber: 11,
      netkeibaVenueCode: '05',
    });
    expect(sourceUrl).toBe(SOURCE_URL);
  });

  it('通常出走馬の全項目を取り出す。馬名は a の text より title を優先する', () => {
    const { horses } = parseShutuba(buildShutuba(NORMAL_ROW), SOURCE_URL);

    expect(horses).toHaveLength(1);
    expect(horses[0]).toEqual({
      horseNumber: 1,
      bracketNumber: 1,
      name: 'ダノンデサイル',
      gender: 'HORSE',
      age: 3,
      jockey: '横山典',
      weight: 57,
      odds: 3.4,
      scratched: false,
    });
  });

  it('取消馬は scratched になり、騎手の a が無いと jockey は null になる', () => {
    const { horses } = parseShutuba(buildShutuba(NORMAL_ROW + SCRATCHED_ROW), SOURCE_URL);

    expect(horses).toHaveLength(2);
    expect(horses[1]).toEqual({
      horseNumber: 2,
      bracketNumber: 2,
      name: 'シンエンペラー',
      gender: 'MARE',
      age: 4,
      jockey: null,
      weight: 55,
      odds: null,
      scratched: true,
    });
  });

  it('騎手の a が空要素のときは null ではなく空文字になる', () => {
    const { horses } = parseShutuba(buildShutuba(NORMAL_ROW + EMPTY_JOCKEY_ROW), SOURCE_URL);

    expect(horses[1].jockey).toBe('');
    expect(horses[1].gender).toBe('GELDING');
    expect(horses[1].age).toBe(5);
    expect(horses[1].bracketNumber).toBe(3);
    expect(horses[1].odds).toBe(12.7);
  });

  it('枠番セルが空の行は枠番を null にする', () => {
    const blankWaku = NORMAL_ROW.replace(
      '<td class="Waku1 Txt_C"><span>1</span></td>',
      '<td class="Waku1 Txt_C"></td>'
    );
    const { horses } = parseShutuba(buildShutuba(NORMAL_ROW + blankWaku), SOURCE_URL);

    expect(horses[0].bracketNumber).toBe(1);
    expect(horses[1].bracketNumber).toBeNull();
  });

  it('枠番が確定していない出馬表は例外にする', () => {
    const unconfirmed = buildShutuba(NORMAL_ROW.replace('Waku1 Txt_C', 'Waku Txt_C'));

    expect(() => parseShutuba(unconfirmed, SOURCE_URL)).toThrow('馬番・枠番が確定していません');
  });

  it('race_id が無い URL は例外にする', () => {
    expect(() => parseShutuba(buildShutuba(NORMAL_ROW), 'https://race.netkeiba.com/race/shutuba.html')).toThrow(
      'URLの形式が正しくありません'
    );
  });
});
