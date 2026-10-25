/* =====================================================================
   解盘引擎 v2 · 时家转盘（张志春体系）
   ---------------------------------------------------------------------
   分三层，任何一句结论都能顺着往下查：

   一、取用神  每个问事对应一个用神，用神就是这件事在盘上的代号。
              取用神的规则写在 YONG 里，界面上直接写出来。
   二、看判据  用神落宫后逐条过九条判据：门、星、神、宫门生克、十干克应、
              四害、月令旺衰、与日干宫、与值符宫。每条都写明
              「规则是什么 → 本盘数据是什么 → 所以判助/忌/平」。
   三、落结论  先查硬凶（空亡、入墓、门迫、凶格），再数助忌：
              助多两条判可为，多一条判可为但须用力，持平判反复，
              忌多判难成。结论句把计数写出来，可当场核对。

   依据：门星神的吉凶分类、四害、旺相休囚死为断法通则；
   十干克应取张志春《神奇之门》所列成对格局，只收各派一致、象意明确者。
   本引擎只呈现盘内关系，不作期日断言，也不替代专业判断。
   ===================================================================== */
(function () {
  'use strict';

  // ---------- 五行 ----------
  const WX_PALACE = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const WX_MEN = { 休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金' };
  const WX_XING = { 天蓬: '水', 天任: '土', 天冲: '木', 天辅: '木', 天英: '火', 天芮: '土', 天柱: '金', 天心: '金', 芮禽: '土', 天禽: '土' };
  const WX_SHEN = { 值符: '土', 螣蛇: '火', 太阴: '金', 六合: '木', 白虎: '金', 玄武: '水', 九地: '土', 九天: '金' };
  const WX_GAN = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };

  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };  // A 生 SHENG[A]
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // A 克 KE[A]
  const rel = (a, b) => {                 // a 对 b
    if (!a || !b) return '无';
    if (a === b) return '同';
    if (SHENG[a] === b) return '生';
    if (SHENG[b] === a) return '受生';
    if (KE[a] === b) return '克';
    if (KE[b] === a) return '受克';
    return '无';
  };

  // ---------- 月令旺衰 ----------
  const SEASON_WX = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const WS_TEXT = {
    旺: '当令，气最盛', 相: '受令所生，气在长', 休: '生令而泄，气平平',
    囚: '克令自伤，气受制', 死: '被令所克，气最弱'
  };
  const WS_JUDGE = { 旺: '助', 相: '助', 休: '平', 囚: '忌', 死: '忌' };
  function wangShuai(el, monthZhi) {
    const w = SEASON_WX[monthZhi];
    if (!el || !w) return null;
    if (el === w) return '旺';
    if (SHENG[w] === el) return '相';
    if (SHENG[el] === w) return '休';
    if (KE[el] === w) return '囚';
    if (KE[w] === el) return '死';
    return null;
  }

  // ---------- 吉凶分类（断法通则） ----------
  const MEN_LV = { 开门: 1, 休门: 1, 生门: 1, 死门: -1, 惊门: -1, 伤门: -1, 杜门: 0, 景门: 0 };
  const XING_LV = { 天心: 1, 天任: 1, 天辅: 1, 芮禽: 1, 天禽: 1, 天蓬: -1, 天芮: -1, 天柱: -1, 天冲: 0, 天英: 0 };
  const SHEN_LV = { 值符: 1, 太阴: 1, 六合: 1, 九地: 1, 九天: 1, 螣蛇: -1, 白虎: -1, 玄武: -1 };
  const LV_TXT = { 1: '吉', 0: '平', '-1': '凶' };
  const MEN_RULE = '八门分三吉（开、休、生）、三凶（死、惊、伤）、二平（杜、景）。';
  const XING_RULE = '九星分吉（天心、天任、天辅、芮禽）、凶（天蓬、天芮、天柱）、平（天冲、天英）。';
  const SHEN_RULE = '八神分吉（值符、太阴、六合、九地、九天）、凶（螣蛇、白虎、玄武）。';

  // ---------- 十干克应（天盘干加地盘干，同宫成格） ----------
  // 只收象意明确、各派一致的成对格局：k=1 吉、-1 凶
  const GE = {
    '戊丙': { k: 1, name: '青龙返首', text: '大吉之格，谋事、就职、迁移、求财皆宜。' },
    '丙戊': { k: 1, name: '飞鸟跌穴', text: '大吉之格，事有意外之助，求谋易成。' },
    '乙丙': { k: 1, name: '奇仪顺遂', text: '奇临奇，事顺人和，谋为多得助力。' },
    '丙丁': { k: 1, name: '星奇相会', text: '文书光明，宜献策、考试、见贵。' },
    '丁乙': { k: 1, name: '玉女奇生', text: '阴助暗成，宜和合、密谋、婚嫁。' },
    '乙辛': { k: -1, name: '青龙逃走', text: '事有走失、避逃之象，人财易散。' },
    '辛乙': { k: -1, name: '白虎猖狂', text: '刚暴相逼，主争斗、伤损、强压。' },
    '丁癸': { k: -1, name: '朱雀投江', text: '文书音信沉没，口舌虚惊，事多不成。' },
    '癸丁': { k: -1, name: '螣蛇夭矫', text: '缠绕反复，虚惊怪梦，事难落定。' },
    '庚丙': { k: -1, name: '太白入荧', text: '外敌入内，主争夺、侵夺、口舌官非。' },
    '丙庚': { k: -1, name: '荧入太白', text: '火金相战，财物耗散，事多争夺。' },
    '戊辛': { k: -1, name: '青龙折足', text: '根基有损，主折伤、失财、半途而废。' },
    '乙己': { k: -1, name: '日奇入墓', text: '气数入库，事情压着不发，须待时。' },
    '乙庚': { k: -1, name: '日奇被刑', text: '争讼财产、彼此怀私，合作易生嫌隙。' },
    '庚癸': { k: -1, name: '大格', text: '道路阻隔，行止两难，事多迟滞。' }
  };

  // ---------- 用神 ----------
  const YONG = {
    career: {
      key: 'career', label: '事业 · 工作', short: '事业',
      primary: [['men', '开门']],
      rule: '求职、工作、单位以开门为用神（开门主事业、公门、开创）；日干为求测人自己，值符为领导、上级。',
      note: '看开门落宫的门、星、神与四害，再看它与日干宫（你自己）的生克。'
    },
    wealth: {
      key: 'wealth', label: '财运 · 求财', short: '财运',
      primary: [['men', '生门']],
      rule: '求财以生门为用神（生门主生机、财利）；戊为资本，六合主交易成合。',
      note: '看生门是否得地得生；再看与日干宫的生克，定「财来找我」还是「我去求财」。'
    },
    love: {
      key: 'love', label: '感情 · 婚恋', short: '感情',
      primary: [['shen', '六合']],
      rule: '婚恋以六合为用神（六合主和合、婚姻、中介）；乙为女方、庚为男方，两宫生克看双方情势。',
      note: '先看六合落宫的和合之气，再比乙宫与庚宫，定谁主动、谁受制。'
    },
    health: {
      key: 'health', label: '健康 · 疾病', short: '健康',
      primary: [['xing', '天芮']],
      flip: true,
      rule: '疾病以天芮为病星（天芮主疾病、阴昧）；天心为医星，白虎主急症血光。',
      note: '问病读的是病本身：病星得势则病重，受制则病轻；再看天心（医）是否有气。'
    },
    exam: {
      key: 'exam', label: '考试 · 文书', short: '考试',
      primary: [['men', '景门']],
      rule: '考试、文书以景门为用神（景门主文书、考试、脸面）；天辅为文星，丁为文书。',
      note: '看景门与天辅的气数；文书之事最忌空亡与入墓。'
    },
    travel: {
      key: 'travel', label: '出行 · 迁移', short: '出行',
      primary: [['men', '开门']],
      rule: '出行以开门为用神（开门主远行、公开）；驿马看动象，日干为出行之人。',
      note: '看开门是否得生、马星是否临用神宫；马星不到，多是想动而未动。'
    },
    legal: {
      key: 'legal', label: '官非 · 争讼', short: '官非',
      primary: [['men', '惊门']],
      rule: '官非、争讼以惊门为用神（惊门主口舌、官非、虚惊）；白虎主刑伤，值符看裁决。',
      note: '看惊门与白虎的气数，再看日干宫是否受克——受克则己方吃力。'
    },
    general: {
      key: 'general', label: '综合 · 未定事', short: '综合',
      primary: [['men', '开门']],
      rule: '未定所问时，以日干为求测人、时干为所问之事，兼看值符（大局）与值使（门径）。',
      note: '先看日干与时干两宫的生克，再看值符值使定大势与门径。'
    }
  };

  const P_NAME = { 1: '坎一', 2: '坤二', 3: '震三', 4: '巽四', 5: '中五', 6: '乾六', 7: '兑七', 8: '艮八', 9: '离九' };
  const P_DIR = { 1: '正北', 2: '西南', 3: '正东', 4: '东南', 5: '中宫', 6: '西北', 7: '正西', 8: '东北', 9: '正南' };

  // ---------- 定位 ----------
  const palaceOf = {
    men: (r, n) => { for (let p = 1; p <= 9; p++) if (r.palaces[p] && r.palaces[p].men === n) return p; return null; },
    xing: (r, n) => {
      for (let p = 1; p <= 9; p++) {
        const x = r.palaces[p] && r.palaces[p].tianXing;
        if (x === n || (n === '天芮' && x === '芮禽')) return p;
      }
      return null;
    },
    shen: (r, n) => { for (let p = 1; p <= 9; p++) if (r.palaces[p] && r.palaces[p].shen === n) return p; return null; },
    gan: (r, n) => { for (let p = 1; p <= 9; p++) if (r.palaces[p] && r.palaces[p].tianGan === n) return p; return null; }
  };

  function harmsOf(r, p) {
    const info = r.palaces[p] || {};
    const out = [];
    const gan = info.tianGan;
    if (gan && typeof XING_XING !== 'undefined' && XING_XING[gan] === p) out.push({ k: '击刑', why: `${gan} 落 ${P_NAME[p]}，六仪击刑` });
    if (gan && typeof RU_MU !== 'undefined' && RU_MU[gan] === p) out.push({ k: '入墓', why: `${gan} 墓于 ${P_NAME[p]}` });
    if (info.men && typeof MEN_PO !== 'undefined' && MEN_PO[info.men] && MEN_PO[info.men].indexOf(p) >= 0) out.push({ k: '门迫', why: info.men + '（' + WX_MEN[info.men] + '）克宫（' + WX_PALACE[p] + '），宫受门迫' });
    const kong = [];
    if (r.kongDay.indexOf && r.kongDay.some(z => typeof ZHI_PALACE !== 'undefined' && ZHI_PALACE[z] === p)) kong.push('日空');
    if (r.kongHour.indexOf && r.kongHour.some(z => typeof ZHI_PALACE !== 'undefined' && ZHI_PALACE[z] === p)) kong.push('时空');
    if (kong.length) out.push({ k: '空亡', why: `${kong.join('、')}在此宫，气不实地` });
    return out;
  }

  const GE_KEY = (a, b) => (a && b && a !== '甲' && b !== '甲') ? a + b : null;
  function geOf(r, p) {
    const info = r.palaces[p] || {};
    const key = GE_KEY(info.tianGan, info.diGan);
    return (key && GE[key]) ? Object.assign({ key: key }, GE[key]) : null;
  }

  // ---------- 主分析 ----------
  function analyze(r, qKey) {
    const q = YONG[qKey] || YONG.general;
    const mZhi = r.mP.zhi;
    const dGan = r.dP.gan;
    const dP = palaceOf.gan(r, dGan) || r.zhiFuPalace;

    let yong = null;
    for (let i = 0; i < q.primary.length; i++) {
      const kind = q.primary[i][0], name = q.primary[i][1];
      const p = palaceOf[kind](r, name);
      if (p) { yong = { kind: kind, name: name, p: p }; break; }
    }
    if (!yong) yong = { kind: 'palace', name: P_NAME[r.zhiFuPalace], p: r.zhiFuPalace };
    // 综合：以日干（求测人）为用神，才与「事业」的问法区分开
    if (q.key === 'general') yong = { kind: 'gan', name: dGan, p: dP };

    const info = r.palaces[yong.p] || {};
    const yEl = yong.kind === 'men' ? WX_MEN[yong.name]
      : yong.kind === 'xing' ? WX_XING[yong.name]
        : yong.kind === 'shen' ? WX_SHEN[yong.name]
          : yong.kind === 'gan' ? WX_GAN[yong.name]
            : WX_PALACE[yong.p];
    const pEl = WX_PALACE[yong.p];

    const C = [];
    const add = o => { C.push(o); return o; };
    const judgeOf = lv => lv === 1 ? '助' : lv === -1 ? '忌' : '平';

    // 1 八门
    if (info.men && MEN_LV[info.men] !== undefined) {
      const lv = MEN_LV[info.men];
      add({
        id: 'men', name: yong.kind === 'men' ? '用神（门）' : '同宫之门',
        data: info.men + '（' + LV_TXT[lv] + '门）临 ' + P_NAME[yong.p],
        rule: MEN_RULE,
        why: info.men + '属' + ['三吉门（开、休、生）', '三凶门（死、惊、伤）', '二平门（杜、景）'][lv === 1 ? 0 : lv === -1 ? 1 : 2] + '，故判' + LV_TXT[lv] + '。',
        judge: judgeOf(lv)
      });
    }
    // 2 九星
    if (info.tianXing && XING_LV[info.tianXing] !== undefined) {
      const lv = XING_LV[info.tianXing];
      add({
        id: 'xing', name: yong.kind === 'xing' ? '用神（星）' : '所临九星',
        data: info.tianXing + '（' + LV_TXT[lv] + '星）加临' + P_NAME[yong.p],
        rule: XING_RULE,
        why: '按九星吉凶分类，' + info.tianXing + '为' + LV_TXT[lv] + '星。',
        judge: judgeOf(lv)
      });
    }
    // 3 八神
    if (info.shen && SHEN_LV[info.shen] !== undefined) {
      const lv = SHEN_LV[info.shen];
      add({
        id: 'shen', name: yong.kind === 'shen' ? '用神（神）' : '所临八神',
        data: info.shen + '（' + LV_TXT[lv] + '神）临宫',
        rule: SHEN_RULE,
        why: '按八神吉凶分类，' + info.shen + '为' + LV_TXT[lv] + '神。',
        judge: judgeOf(lv)
      });
    }
    // 4 宫与用神生克
    const rp = rel(pEl, yEl);
    const map4 = { '生': 1, '克': -1, '受生': -1, '受克': 1, '同': 0, '无': 0 };
    const why4 = {
      '生': '宫' + pEl + '生用神' + yEl + '，用神得地，做事有依托。',
      '克': '宫' + pEl + '克用神' + yEl + '，用神受制，处处掣肘。',
      '受生': '用神' + yEl + '生宫' + pEl + '，力气泄于外，事成而耗己。',
      '受克': '用神' + yEl + '克宫' + pEl + '，用神能任其事，但须自己用力。',
      '同': '宫与用神同属' + yEl + '，比和，无生无克。',
      '无': '宫（' + pEl + '）与用神（' + yEl + '）不相生克。'
    }[rp];
    add({
      id: 'gong', name: '宫与用神',
      data: '宫 ' + P_NAME[yong.p] + ' 属' + pEl + ' · 用神 ' + yong.name + ' 属' + yEl,
      rule: '宫生用神为得地，宫克用神为受制；用神生宫为泄气，用神克宫为能任。',
      why: why4, judge: map4[rp] === 1 ? '助' : map4[rp] === -1 ? '忌' : '平'
    });
    // 5 十干克应
    const ge = geOf(r, yong.p);
    if (ge) {
      add({
        id: 'ge', name: '十干克应',
        data: '天盘' + info.tianGan + ' 加 地盘' + info.diGan + ' →「' + ge.name + '」',
        rule: '天盘干加地盘干同宫，按组合定格局吉凶（张志春《神奇之门》所列成对格局）。',
        why: ge.text, judge: ge.k > 0 ? '助' : '忌', strong: ge.k < 0
      });
    }
    // 6 四害
    const harms = harmsOf(r, yong.p);
    add({
      id: 'harm', name: '四害',
      data: harms.length ? harms.map(h => h.k).join('、') : '无',
      rule: '击刑、入墓、门迫、空亡为四害：击刑为六仪自刑，入墓为干气入库，门迫为门克宫，空亡为气不落地；逢之则用神有伤，力量打折。',
      why: harms.length ? harms.map(h => h.why).join('；') + '。' : '此宫不见击刑、入墓、门迫、空亡，用神清净。',
      judge: harms.length ? '忌' : '平', hard: harms.length > 0
    });
    // 7 月令旺衰
    const ws = wangShuai(yEl, mZhi);
    if (ws) {
      add({
        id: 'ws', name: '月令气数',
        data: mZhi + '月 · 用神属' + yEl + ' →「' + ws + '」',
        rule: '以月支当旺之五行为准：比令为旺、令生为相、生令为休、克令为囚、令克为死。',
        why: WS_TEXT[ws] + '。' + (WS_JUDGE[ws] === '助' ? '气数在位，能成事。' : WS_JUDGE[ws] === '忌' ? '气数不在位，做事吃力。' : '气数平平，成事须借外力。'),
        judge: WS_JUDGE[ws]
      });
    }
    // 8 与日干宫
    const dEl = WX_PALACE[dP];
    const rd = rel(dEl, yEl);
    const map8 = { '生': 1, '受生': 0, '克': -1, '受克': 1, '同': 0, '无': 0 };
    add({
      id: 'day', name: '与日干宫',
      data: '日干 ' + dGan + ' 落 ' + P_NAME[dP] + '（' + dEl + '）· 对用神（' + yEl + '）为「' + rd + '」',
      rule: '日干代表求测人：用神生日干为事来就我；日干生用神为我须出力；用神克日干为事强我弱；日干克用神为我能制事。',
      why: {
        '生': '事来就我，顺而易成。', '受生': '我要出力去就事，主动则成。',
        '克': '事强我弱，勉强易受伤。', '受克': '我能制事，可主动出手。',
        '同': '日干与用神同气，事在己手。', '无': '两者不相干，须借外力。'
      }[rd],
      judge: map8[rd] === 1 ? '助' : map8[rd] === -1 ? '忌' : '平'
    });
    // 9 与值符宫
    const fP = r.zhiFuPalace, fEl = WX_PALACE[fP];
    const rf = rel(fEl, yEl);
    const map9 = { '生': 1, '受生': 0, '克': -1, '受克': 0, '同': 0, '无': 0 };
    add({
      id: 'fu', name: '与值符宫',
      data: '值符落 ' + P_NAME[fP] + '（' + fEl + '）· 对用神（' + yEl + '）为「' + rf + '」',
      rule: '值符为大局与主事之人：生用神则得势，克用神则环境不容。',
      why: {
        '生': '大势相扶，有上级与环境之助。', '受生': '用神泄气于大局，事成而分利。',
        '克': '大势相压，环境不容。', '受克': '能逆势而行，但费力。',
        '同': '与大局同气，上下同心。', '无': '与大势无涉。'
      }[rf],
      judge: map9[rf] === 1 ? '助' : map9[rf] === -1 ? '忌' : '平'
    });

    // 附加判据：感情比乙庚；疾病看医星
    const extra = [];
    if (q.key === 'love') {
      const pYi = palaceOf.gan(r, '乙'), pGeng = palaceOf.gan(r, '庚');
      if (pYi && pGeng) {
        const rr = rel(WX_PALACE[pYi], WX_PALACE[pGeng]);
        extra.push({
          name: '乙庚两宫',
          data: '乙落' + P_NAME[pYi] + '（' + WX_PALACE[pYi] + '）· 庚落' + P_NAME[pGeng] + '（' + WX_PALACE[pGeng] + '）→「' + rr + '」',
          rule: '乙为女方、庚为男方，两宫相生相合则情投，相克则多龃龉。',
          why: {
            '生': '乙宫生庚宫，一方主动付出。', '受生': '庚宫生乙宫，对方来就。',
            '克': '乙宫克庚宫，一方压制。', '受克': '庚宫克乙宫，己方受制。',
            '同': '同气相求，脾性相近。', '无': '两宫无涉，缘薄须牵线。'
          }[rr],
          judge: (rr === '生' || rr === '同' || rr === '受生') ? '助' : '忌'
        });
      }
    }
    if (q.key === 'general') {
      const hGan = r.hP.gan, pH = palaceOf.gan(r, hGan);
      if (pH) {
        const rr = rel(WX_PALACE[pH], WX_PALACE[dP]);
        extra.push({
          name: '与时干宫',
          data: '时干 ' + hGan + ' 落 ' + P_NAME[pH] + '（' + WX_PALACE[pH] + '）· 对日干宫（' + WX_PALACE[dP] + '）为「' + rr + '」',
          rule: '日干为求测人、时干为所问之事；时干宫对日干宫相生则事来就我，相克则事与我相违。',
          why: {
            '生': '事来就我，顺而易成。', '受生': '我须出力去就事。',
            '克': '事强我弱，勉强易伤。', '受克': '我能制事，可主动出手。',
            '同': '人与事同气，事在己手。', '无': '人与事无涉，须借外力。'
          }[rr],
          judge: (rr === '生' || rr === '同' || rr === '受克') ? '助' : (rr === '克' ? '忌' : '平')
        });
      }
    }
    if (q.key === 'health') {
      const pXin = palaceOf.xing(r, '天心');
      if (pXin) {
        const ok = WX_PALACE[pXin] === '金' || rel(WX_PALACE[pXin], '金') === '生';
        extra.push({
          name: '医星天心',
          data: '天心落 ' + P_NAME[pXin] + '（' + WX_PALACE[pXin] + '）',
          rule: '天心为医星，落宫得地则医治得力，受制则药不对症。',
          why: ok ? '医星得地，宜找对医生、用对治法。' : '医星气弱，宜换治法或再问一位医生。',
          judge: ok ? '助' : '忌'
        });
      }
    }

    // 用神即日干时，「与日干宫」这一条是自己比自己，删掉
    if (q.key === 'general') {
      for (let i = C.length - 1; i >= 0; i--) if (C[i].id === 'day') C.splice(i, 1);
    }

    const allRows = C.concat(extra);        // 附加判据（乙庚、时干、医星）与九条同权计入
    const help = allRows.filter(c => c.judge === '助');
    const bad = allRows.filter(c => c.judge === '忌');
    const flat = allRows.filter(c => c.judge === '平');
    const hard = allRows.filter(c => c.hard);
    const hardTxt = hard.length ? hard.map(h => h.data).join('、') : '';
    const badGe = allRows.filter(c => c.strong);

    let verdict, tone, logic;
    if (q.flip) {
      // 疾病：判据方向相反——病星得势则病重
      const score = heavyPower(r, yong.p, info, ws, ge);
      if (score >= 2.5) { verdict = '病势偏重，宜速就医'; tone = 'bad'; }
      else if (score >= 1) { verdict = '病势已起，宜早调治'; tone = 'mid'; }
      else if (score >= -0.5) { verdict = '缠绵反复，宜持续调养'; tone = 'mid'; }
      else { verdict = '病势偏轻，可调养'; tone = 'good'; }
      logic = '疾病以病星天芮为用神，读法与其余问事相反：病星得势（旺相、得吉格之助、宫生病星）则病重，受制（休囚死、空亡、被克）则病轻。'
        + '本盘病星落 ' + P_NAME[yong.p] + '，气数「' + (ws || '—') + '」' + (ge ? '，同宫见「' + ge.name + '」' : '')
        + '，宫属' + pEl + '对病星为「' + rel(pEl, '土') + '」，故判' + verdict + '。';
    } else {
      const nh = help.length, nb = bad.length;
      if (hard.length && nb - nh >= 2) {
        verdict = '难成，宜止'; tone = 'bad';
        logic = '用神带' + hardTxt + '（硬凶），且忌项 ' + nb + ' 条多于助项 ' + nh + ' 条，故判难成。';
      } else if (nh >= nb + 2) {
        verdict = badGe.length ? '可成，但带一处硬伤' : '可为';
        tone = 'good';
        logic = '助项 ' + nh + ' 条、忌项 ' + nb + ' 条、平项 ' + flat.length + ' 条'
          + (hard.length ? '，用神带' + hardTxt : '，无四害')
          + (badGe.length ? '；惟见凶格「' + info.tianGan + '加' + info.diGan + '」' : '')
          + '。助多于忌，故判' + verdict + '。';
      } else if (nh > nb) {
        verdict = hard.length ? '可为，但带伤' : '可为，须用力';
        tone = 'good';
        logic = '助项 ' + nh + ' 条略多于忌项 ' + nb + ' 条'
          + (hard.length ? '，但用神带' + hardTxt : '') + '。气数是通的，但要自己使劲，故判' + verdict + '。';
      } else if (nh === nb) {
        verdict = '反复，半成'; tone = 'mid';
        logic = '助项与忌项各 ' + nh + ' 条，气数两平；'
          + (hard.length ? '且用神带' + hardTxt + '。' : '没有四害，但也推不动。') + '故判半成。';
      } else {
        verdict = '难成，宜缓'; tone = 'bad';
        logic = '忌项 ' + nb + ' 条多于助项 ' + nh + ' 条'
          + (hard.length ? '，用神又带' + hardTxt : '') + '，事多阻碍，故判难成。';
      }
    }

    if (flat.length) logic += '（平项 ' + flat.length + ' 条，无吉无凶，不左右胜负；决定成败的是助 ' + help.length + ' 与忌 ' + bad.length + '。）';

    const advice = buildAdvice(r, q, yong, info, harms, tone, ws);

    return {
      q: q, yong: yong, info: info, ge: ge, harms: harms, ws: ws, el: yEl, pEl: pEl,
      dayPalace: dP, dayGan: dGan, dayEl: dEl, fuPalace: fP, fuEl: fEl,
      criteria: C, extra: extra,
      tally: { help: help.length, harm: bad.length, flat: flat.length },
      // 疾病读的是病势：凶项（忌）＝ 病重，吉项（助）＝ 病轻
      sideLabels: q.flip ? ['轻', '重', '平'] : ['助', '忌', '平'],
      verdict: verdict, tone: tone, logic: logic, advice: advice
    };
  }

  function heavyPower(r, p, info, ws, ge) {
    let s = 0;
    if (ws === '旺') s += 2; else if (ws === '相') s += 1.5;
    else if (ws === '休') s += 0.5; else if (ws === '囚') s -= 0.5; else if (ws === '死') s -= 1;
    if (ge) s += ge.k > 0 ? 1 : -1;
    const g = rel(WX_PALACE[p], '土');
    if (g === '生') s += 1; else if (g === '受生') s += 0.3; else if (g === '克' || g === '受克') s -= 1;
    if (harmsOf(r, p).some(h => h.k === '空亡')) s -= 1.5;
    if (info.men && MEN_LV[info.men] === -1) s += 0.5;
    return s;
  }

  function buildAdvice(r, q, yong, info, harms, tone, ws) {
    const a = [];
    const dir = P_DIR[yong.p], pl = P_NAME[yong.p];
    if (q.key === 'health') {
      a.push('病星在 ' + pl + '（' + dir + '）：气数在这里最需要照看。');
      a.push('解盘只看气数走向，身体的判断交给医生；盘面用来决定「什么时候去看、往哪个方向找帮手」。');
    } else {
      a.push(tone === 'bad'
        ? '用神在 ' + pl + '（' + dir + '），此方眼下不宜强推；改从值符所在 ' + P_DIR[r.zhiFuPalace] + ' 一侧找助力。'
        : '用神在 ' + pl + '（' + dir + '），面谈、约见、递材料可优先取此方位。');
    }
    if (harms.some(h => h.k === '空亡')) a.push('用神落空：多是「说了没落地」，等填实再动。');
    if (harms.some(h => h.k === '入墓')) a.push('用神入墓：事情压着不发，先处理旧账旧关系。');
    if (harms.some(h => h.k === '门迫')) a.push('门迫：门为宫所克，门径被堵，换人换路再谈。');
    if (ws === '死' || ws === '囚') a.push('月令不在位：这段气数不帮事，别硬赶时间。');
    if (info.men && MEN_LV[info.men] === 1 && tone !== 'bad') a.push(info.men + '当事，正当其时，可以主动开口。');
    a.push('门径看值使：' + r.zhiShiMen + ' 落 ' + P_NAME[r.shiShiPalace] + '（' + P_DIR[r.shiShiPalace] + '），办事从这一面入手。');
    return a;
  }

  // ---------- 六步跟读 ----------
  function teachSteps(r, qKey) {
    const a = analyze(r, qKey);
    const S = [];
    S.push({
      title: '一 · 先认得这是什么局', palace: null,
      body: '本局为 <b>' + (r.isYang ? '阳遁' : '阴遁') + ' ' + r.juInfo.ju + ' 局</b>，节气「' + r.cur.name + '」，旬首 <b>'
        + r.hourXun.xunYi + '</b>。值符星 <b>' + r.zhiFuXing + '</b> 落 ' + P_NAME[r.zhiFuPalace]
        + '，值使门 <b>' + r.zhiShiMen + '</b> 落 ' + P_NAME[r.shiShiPalace] + '。'
        + '<span class="jp-dim">值符看大势与上级，值使看门径与着手处；其余判据都围着用神转。</span>'
    });
    S.push({
      title: '二 · 定用神：这件事在盘上是哪个符号', palace: a.yong.p,
      body: '问的是 <b>' + a.q.label + '</b>。<br><b>取用神规则</b>：' + a.q.rule + '<br>'
        + '本盘 <b>' + a.yong.name + '</b> 落 <b>' + P_NAME[a.yong.p] + '（' + P_DIR[a.yong.p] + '）</b>，属 ' + a.el + '，此宫即是事体本身。'
        + '<span class="jp-dim">同一个盘换个问事，用神就换，结论跟着换——这是奇门只答具体问题的原因。</span>'
    });
    S.push({
      title: '三 · 看这一宫的门、星、神', palace: a.yong.p,
      body: '用神宫上：门 <b>' + (a.info.men || '—') + '</b>、星 <b>' + (a.info.tianXing || '—') + '</b>、神 <b>' + (a.info.shen || '—') + '</b>，'
        + '天盘干 <b>' + a.info.tianGan + '</b> 加 地盘干 <b>' + a.info.diGan + '</b>。'
        + (a.ge ? '<br>两干成格：<b>' + a.ge.name + '</b>——' + a.ge.text : '<br>两干未成有名之格，只按五行生克看。')
        + '<span class="jp-dim">门看性质与门径、星看人气、神看助力与暗情、两干看克应，这四条是这一宫的基本盘。</span>'
    });
    S.push({
      title: '四 · 查四害：气有没有被破', palace: a.yong.p,
      body: a.harms.length
        ? '此宫带 <b>' + a.harms.map(h => h.k).join('、') + '</b>：' + a.harms.map(h => h.why).join('；') + '。四害属硬凶，先记下，定结论时优先看它。'
        : '此宫不见击刑、入墓、门迫、空亡，用神清净，这是好底子。'
    });
    S.push({
      title: '五 · 比气数：月令与三重关系', palace: a.yong.p,
      body: '用神属 <b>' + a.el + '</b>，' + r.mP.zhi + ' 月为「<b>' + (a.ws || '—') + '</b>」' + (a.ws ? '（' + WS_TEXT[a.ws] + '）' : '') + '。<br>'
        + '与宫：' + P_NAME[a.yong.p] + '属' + a.pEl + '，对用神为「' + rel(a.pEl, a.el) + '」。<br>'
        + '与日干 ' + a.dayGan + '：其宫属' + a.dayEl + '，对用神为「' + rel(a.dayEl, a.el) + '」。<br>'
        + '与值符：其宫属' + a.fuEl + '，对用神为「' + rel(a.fuEl, a.el) + '」。'
    });
    S.push({
      title: '六 · 落结论：硬凶优先，再数助忌', palace: a.yong.p,
      body: '<b>判法</b>：先查硬凶（空亡、入墓、门迫、凶格）——有则事有伤；再数各条判据里助、平、忌各几条。'
        + '助多于忌两条判可为，多一条判可为但须用力，持平判反复，忌多于助判难成。<br>'
        + '本盘：助 <b>' + a.tally.help + '</b> 条、忌 <b>' + a.tally.harm + '</b> 条、平 <b>' + a.tally.flat + '</b> 条 → <b>' + a.verdict + '</b>。'
        + '<span class="jp-dim">这道算术逐条写在「判据」里，可以一条条核对，不是凭感觉下的断语。</span>'
    });
    return S;
  }

  // ---------- 渲染 ----------
  function chip(judge) {
    const cls = judge === '助' ? 'good' : judge === '忌' ? 'bad' : 'mid';
    return '<span class="jp-chip ' + cls + '">' + judge + '</span>';
  }

  function critHTML(c) {
    return '<li class="jp-crit ' + (c.judge === '助' ? 'pos' : c.judge === '忌' ? 'neg' : 'neu') + '">'
      + '<div class="jp-c-head"><b>' + c.name + '</b>' + chip(c.judge) + '</div>'
      + '<div class="jp-c-data">' + c.data + '</div>'
      + '<div class="jp-c-why">' + c.why + '</div>'
      + '<details class="jp-why"><summary>依据</summary><div><b>规则</b>：' + c.rule + '</div></details>'
      + '</li>';
  }

  function render(container, r, qKey, opts) {
    opts = opts || {};
    if (!r) { container.innerHTML = '<div class="jp-empty">先排一局，再看解盘。</div>'; return; }
    const a = analyze(r, qKey);

    const qs = Object.keys(YONG).map(function (k) {
      const q = YONG[k], on = q.key === a.q.key;
      return '<button class="jp-q' + (on ? ' on' : '') + '" data-q="' + q.key + '" aria-pressed="' + on + '">'
        + '<span class="jp-tick" aria-hidden="true">' + (on ? '✓' : '') + '</span>' + q.short + '</button>';
    }).join('');

    const geAll = [];
    for (let p = 1; p <= 9; p++) { const g = geOf(r, p); if (g) geAll.push({ p: p, g: g }); }

    container.innerHTML =
      '<div class="jp-wrap">'
      + '<div class="jp-qs">' + qs + '</div>'

      + '<div class="jp-verdict ' + a.tone + '">'
      + '<div class="jp-v-label">' + a.q.label + '</div>'
      + '<div class="jp-v-body">'
      + '<div class="jp-v-left">'
      + '<div class="jp-v-main">' + a.verdict + '</div>'
      + '<div class="jp-v-sub"><span>用神 <b>' + a.yong.name + '</b>（属' + a.el + '）</span>'
      + '<span>落 ' + P_NAME[a.yong.p] + '（' + P_DIR[a.yong.p] + '）</span>'
      + '<span>气数 ' + (a.ws || '—') + '</span></div>'
      + '</div>'
      + '<div class="jp-v-side">'
      + '<div><i>' + a.sideLabels[0] + '</i><b class="good">' + a.tally.help + '</b></div>'
      + '<div><i>' + a.sideLabels[1] + '</i><b class="bad">' + a.tally.harm + '</b></div>'
      + '<div><i>' + a.sideLabels[2] + '</i><b>' + a.tally.flat + '</b></div>'
      + '</div>'
      + '</div></div>'

      + '<div class="jp-logic"><b>怎么断的</b><span class="jp-count"><i class="k1">助 ' + a.tally.help + '</i><i class="k2">忌 ' + a.tally.harm + '</i><i class="k3">平 ' + a.tally.flat + '</i>共 ' + (a.tally.help + a.tally.flat + a.tally.harm) + ' 条判据</span><p>' + a.logic + '</p></div>'

      + '<div class="jp-sect"><h4>判据 · 逐条过</h4>'
      + '<ul class="jp-crits">' + a.criteria.map(critHTML).join('') + '</ul>'
      + (a.extra.length ? '<ul class="jp-crits jp-crits-extra">' + a.extra.map(critHTML).join('') + '</ul>' : '')
      + '</div>'

      + (geAll.length ? '<div class="jp-sect"><h4>本局克应 · 全盘</h4><ul class="jp-ge">'
        + geAll.map(function (o) {
          return '<li class="' + (o.g.k > 0 ? 'pos' : 'neg') + '"><b>' + o.g.name + '</b>'
            + '<span>' + P_NAME[o.p] + ' · 天盘' + r.palaces[o.p].tianGan + ' 加 地盘' + r.palaces[o.p].diGan + '</span>'
            + '<em>' + o.g.text + '</em></li>';
        }).join('') + '</ul></div>' : '')

      + '<div class="jp-sect"><h4>怎么用</h4><ul class="jp-adv">'
      + a.advice.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>'

      + '<div class="jp-sect"><h4>这一局怎么读出来 · 六步</h4><div class="jp-steps" id="jp-steps"></div></div>'

      + '<div class="jp-foot">'
      + '<span class="jp-legend"><i class="pos"></i>助 <i class="neg"></i>忌 <i class="neu"></i>平</span>'
      + '体系：时家转盘 · 拆补法定局；十干克应取张志春《神奇之门》所列成对格局，只收各派一致者。'
      + '本页只呈现盘内关系与判断路径，不作期日断言，也不替代专业判断。'
      + '</div>'
      + '</div>';

    const steps = teachSteps(r, qKey);
    const stepsBox = container.querySelector('#jp-steps');
    stepsBox.innerHTML = steps.map(function (s, i) {
      return '<details class="jp-step"' + (i === 1 ? ' open' : '') + '>'
        + '<summary>' + s.title + '</summary>'
        + '<div class="jp-step-body">' + s.body
        + (s.palace ? '<button class="jp-goto" data-palace="' + s.palace + '">在盘面上看此宫 →</button>' : '')
        + '</div></details>';
    }).join('');

    container.querySelectorAll('.jp-q').forEach(function (b) {
      b.addEventListener('click', function () { if (opts.onQuestion) opts.onQuestion(b.dataset.q); });
    });
    container.querySelectorAll('.jp-goto').forEach(function (b) {
      b.addEventListener('click', function () { if (opts.onGoto) opts.onGoto(parseInt(b.dataset.palace, 10)); });
    });
  }

  window.JiePan = { analyze: analyze, render: render, teachSteps: teachSteps, YONG: YONG, GE: GE };
})();
