/* =====================================================================
   解盘引擎 · 时家转盘
   ---------------------------------------------------------------------
   只用两样东西：盘面已算出的数据（r）＋ 本页面既有的象意知识库
   （MEN_INFO / XING_INFO / SHEN_INFO / GAN_INFO / GUA_INFO）。
   不编造克应条文，不做具体吉凶期日之断言，只呈现可追溯的盘内关系：
   用神落宫、门星神吉凶、宫与用神的生克、四害、月令旺衰、与日干宫和
   值符宫的关系。每条断语都附「依据」，可点开看它从哪来。
   ===================================================================== */
(function () {
  'use strict';

  // ---------- 基础：五行 ----------
  const WX_OF_PALACE = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const WX_OF_MEN = { 休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金' };
  const WX_OF_XING = { 天蓬: '水', 天任: '土', 天冲: '木', 天辅: '木', 天英: '火', 天芮: '土', 天柱: '金', 天心: '金', 芮禽: '土', 天禽: '土' };
  const WX_OF_SHEN = { 值符: '土', 螣蛇: '火', 太阴: '金', 六合: '木', 白虎: '金', 玄武: '水', 九地: '土', 九天: '金' };
  const WX_OF_GAN = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const WX_OF_ZHI = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // A 生 SHENG[A]
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };       // A 克 KE[A]

  // 八神条目开头写的是神自身方位（如「南方：…」），放进落宫句子里会跟宫位混淆，只取冒号后的象意
  const shenText = (name) => {
    const t = (typeof SHEN_INFO !== 'undefined' && SHEN_INFO[name]) || '';
    const i = t.indexOf('：');
    return i >= 0 ? t.slice(i + 1) : t;
  };

  const rel = (a, b) => {           // a 对 b 的关系
    if (!a || !b) return '无';
    if (a === b) return '同';
    if (SHENG[a] === b) return '生';
    if (SHENG[b] === a) return '被生';
    if (KE[a] === b) return '克';
    if (KE[b] === a) return '被克';
    return '无';
  };

  // 旺相休囚死：以月令当旺之五行为准
  const SEASON_WX = { 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const WS_SCORE = { 旺: 1, 相: 0.5, 休: 0, 囚: -0.5, 死: -1 };
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
  const WS_TEXT = {
    旺: '当令得时，气数最盛', 相: '受令所生，气数渐长', 休: '生令而泄，气数平平',
    囚: '克令自伤，气数受制', 死: '被令所克，气数最弱'
  };

  // ---------- 吉凶分类 ----------
  const MEN_LEVEL = { 开门: 1, 休门: 1, 生门: 1, 死门: -1, 惊门: -1, 伤门: -1, 杜门: 0, 景门: 0 };
  const XING_LEVEL = { 天心: 1, 天任: 1, 天辅: 1, 芮禽: 1, 天禽: 1, 天蓬: -1, 天芮: -1, 天柱: -1, 天冲: 0, 天英: 0 };
  const SHEN_LEVEL = { 值符: 1, 太阴: 1, 六合: 1, 九地: 1, 九天: 1, 螣蛇: -1, 白虎: -1, 玄武: -1 };
  const LV_NAME = { 1: '吉', 0: '平', '-1': '凶' };

  // ---------- 用神 ----------
  // 主用神：门 / 星 / 神 / 干（干取天盘干落宫）
  const YONG = {
    career:  { key: 'career',  label: '事业 · 工作',  short: '事业',  primary: [['men','开门'],['shen','值符']],
               note: '开门为事业之门，值符为上级与大局，日干为己身。' },
    wealth:  { key: 'wealth',  label: '财运 · 求财',  short: '财运',  primary: [['men','生门'],['gan','戊'],['shen','六合']],
               note: '生门为财门，戊为资本，六合主交易成合。' },
    love:    { key: 'love',    label: '感情 · 婚恋',  short: '感情',  primary: [['shen','六合'],['gan','乙']],
               note: '六合主和合；乙为女方、庚为男方，两宫生克看双方情势。' },
    health:  { key: 'health',  label: '健康 · 疾病',  short: '健康',  primary: [['xing','天芮']], flip: true,
               note: '天芮为病星，此处读的是「病本身」：病星得势则病重，受制则病轻；天心为医、白虎主急。' },
    exam:    { key: 'exam',    label: '考试 · 文书',  short: '考试',  primary: [['men','景门'],['xing','天辅'],['gan','丁']],
               note: '景门主文书考试，天辅为文星，丁为文书。' },
    travel:  { key: 'travel',  label: '出行 · 迁移',  short: '出行',  primary: [['men','开门'],['shen','九天']],
               note: '开门主出行公开，九天主高远，马星看动象。' },
    legal:   { key: 'legal',   label: '官非 · 争讼',  short: '官非',  primary: [['men','惊门'],['shen','白虎'],['shen','值符']],
               note: '惊门主口舌官非，白虎主刑伤，值符看裁决与上意。' },
    general: { key: 'general', label: '综合 · 未定事', short: '综合', primary: [['men','开门'],['shen','值符']],
               note: '未定所问时，以日干为己、时干为事，兼看值符值使。' }
  };

  const VERDICT = {
    normal: [[3, '顺，可为', 'good'], [1.2, '可为，需力', 'good'], [-1.2, '反复，半成', 'mid'],
             [-2.5, '难成，宜缓', 'bad'], [-99, '逆，宜止', 'bad']],
    health: [[3, '病势重，宜速医', 'bad'], [1.2, '病势起，宜早治', 'mid'], [-1.2, '缠绵，宜调理', 'mid'],
             [-99, '病势轻，可调养', 'good']]
  };
  const P_NAME = { 1: '坎一', 2: '坤二', 3: '震三', 4: '巽四', 5: '中五', 6: '乾六', 7: '兑七', 8: '艮八', 9: '离九' };
  const P_DIR = { 1: '正北', 2: '西南', 3: '正东', 4: '东南', 5: '中宫', 6: '西北', 7: '正西', 8: '东北', 9: '正南' };

  // ---------- 工具 ----------
  function ganPalace(r, gan) {            // 天盘干所在宫（干不入中，寄坤）
    for (let p = 1; p <= 9; p++) if (r.palaces[p] && r.palaces[p].tianGan === gan) return p;
    return null;
  }
  function menPalace(r, men) {
    for (let p = 1; p <= 9; p++) if (r.palaces[p] && r.palaces[p].men === men) return p;
    return null;
  }
  function xingPalace(r, xing) {
    for (let p = 1; p <= 9; p++) {
      const x = r.palaces[p] && r.palaces[p].tianXing;
      if (x === xing || (xing === '天芮' && x === '芮禽')) return p;
    }
    return null;
  }
  function shenPalace(r, shen) {
    for (let p = 1; p <= 9; p++) if (r.palaces[p] && r.palaces[p].shen === shen) return p;
    return null;
  }
  function harmsOf(r, p) {
    const info = r.palaces[p] || {};
    const out = [];
    const gan = info.tianGan;
    if (gan && typeof XING_XING !== 'undefined' && XING_XING[gan] === p) out.push('击刑');
    if (gan && typeof RU_MU !== 'undefined' && RU_MU[gan] === p) out.push('入墓');
    if (info.men && typeof MEN_PO !== 'undefined' && MEN_PO[info.men] && MEN_PO[info.men].includes(p)) out.push('门迫');
    if (r.kongDay.some(z => typeof ZHI_PALACE !== 'undefined' && ZHI_PALACE[z] === p)) out.push('日空');
    if (r.kongHour.some(z => typeof ZHI_PALACE !== 'undefined' && ZHI_PALACE[z] === p)) out.push('时空');
    return out;
  }

  // ---------- 分析 ----------
  function analyze(r, qKey) {
    const q = YONG[qKey] || YONG.general;
    const mZhi = r.mP.zhi;
    const pts = [];       // {label, text, w, basis}
    let score = 0;
    const add = (label, text, w, basis) => { pts.push({ label, text, w, basis }); score += w; };

    // 用神：按该问事声明的主次顺序取，取不到才退到值符宫
    let yong = null;
    for (const [kind, name] of q.primary) {
      let p = null;
      if (kind === 'men') p = menPalace(r, name);
      else if (kind === 'xing') p = xingPalace(r, name);
      else if (kind === 'shen') p = shenPalace(r, name);
      else if (kind === 'gan') p = ganPalace(r, name);
      if (p) { yong = { kind: { men: '门', xing: '星', shen: '神', gan: '干' }[kind], name, p }; break; }
    }
    if (!yong) { yong = { kind: '宫', name: P_NAME[r.zhiFuPalace], p: r.zhiFuPalace }; }

    const info = r.palaces[yong.p] || {};
    // 用神五行走用神本身，不是走该宫的八门（病星、神煞、天干各有五行）
    const yEl = yong.kind === '门' ? WX_OF_MEN[yong.name]
              : yong.kind === '星' ? WX_OF_XING[yong.name]
              : yong.kind === '神' ? WX_OF_SHEN[yong.name]
              : yong.kind === '干' ? WX_OF_GAN[yong.name]
              : WX_OF_PALACE[yong.p];

    // 1. 八门
    if (info.men && MEN_LEVEL[info.men] !== undefined) {
      const lv = MEN_LEVEL[info.men];
      const lbl = yong.kind === '门' ? '用神之门' : '同宫之门';
      add(lbl, `${info.men}临${P_NAME[yong.p]}，${LV_NAME[lv]}门。${MEN_INFO[info.men] || ''}`, lv * 1,
        `门吉凶分类：开、休、生为三吉门；死、惊、伤为三凶门；杜、景为中平。此处为${LV_NAME[lv]}。`);
    }
    // 2. 九星
    if (info.tianXing && XING_LEVEL[info.tianXing] !== undefined) {
      const lv = XING_LEVEL[info.tianXing];
      const lbl = yong.kind === '星' ? '用神之星' : '所临九星';
      add(lbl, `${info.tianXing}加临，${LV_NAME[lv]}星。${XING_INFO[info.tianXing] || ''}`, lv * 0.8,
        '九星吉凶：天心、天任、天辅、芮禽为吉；天蓬、天芮、天柱为凶；天冲、天英为中平。');
    }
    // 3. 八神
    if (info.shen && SHEN_LEVEL[info.shen] !== undefined) {
      const lv = SHEN_LEVEL[info.shen];
      const lbl = yong.kind === '神' ? '用神之神' : '所临八神';
      add(lbl, `${info.shen}临宫，${LV_NAME[lv]}神。${shenText(info.shen)}`, lv * 0.7,
        '八神吉凶：值符、太阴、六合、九地、九天为吉；螣蛇、白虎、玄武为凶。');
    }
    // 4. 宫与用神生克
    const pEl = WX_OF_PALACE[yong.p];
    const r1 = rel(pEl, yEl);
    if (r1 === '生') add('宫门相得', `宫${pEl}生用神${yEl}，得地得力，事有依托。`, 1, `生克：${pEl}生${yEl}。`);
    else if (r1 === '克') add('宫克用神', `宫${pEl}克用神${yEl}，处处受制，事多阻碍。`, -1, `生克：${pEl}克${yEl}。`);
    else if (r1 === '被生') add('用神泄气', `用神${yEl}生宫${pEl}，力出于外，成事而耗己。`, -0.5, `生克：${yEl}生${pEl}。`);
    else if (r1 === '被克') add('用神制宫', `用神${yEl}克宫${pEl}，能任其事，但须用力。`, 0.5, `生克：${yEl}克${pEl}。`);
    else add('宫门比和', `宫与用神同属${yEl}，比和相安，无冲无克。`, 0.3, `同气：${pEl}与${yEl}同。`);

    // 5. 四害
    const h = harmsOf(r, yong.p);
    if (h.length) {
      const w = h.includes('时空') || h.includes('门迫') ? -1 : -0.8;
      add('用神带害', `此宫带${h.join('、')}。${h.includes('入墓') ? '气数入库，事难显发；' : ''}${h.includes('击刑') ? '自刑受制，进退两难；' : ''}${h.includes('空') ? '空则虚而不实，须待填实；' : ''}${h.includes('门迫') ? '门为宫克，用神受逼。' : ''}`, w,
        '四害：击刑、入墓、门迫、空亡。用神逢之，力减一等。');
    } else {
      add('用神无伤', '不见击刑、入墓、门迫、空亡，用神清净。', 0.6, '四害皆无。');
    }

    // 6. 月令旺衰
    const ws = wangShuai(yEl, mZhi);
    if (ws) add('月令气数', `用神属${yEl}，${mZhi}月为「${ws}」，${WS_TEXT[ws]}。`, WS_SCORE[ws], `旺相休囚死：以月支${mZhi}所当旺之${SEASON_WX[mZhi]}为准。`);

    // 7. 与日干宫（己身）
    const dGan = r.dP.gan;
    const dP = ganPalace(r, dGan) || r.zhiFuPalace;
    const dEl = WX_OF_PALACE[dP];
    const r2 = rel(dEl, yEl);
    if (r2 === '生') add('事来就我', `用神宫${yEl}生日干宫${dEl}（${dGan}落${P_NAME[dP]}），事来相就，不必强求。`, 1, `生克：${yEl}生${dEl}。`);
    else if (r2 === '被生') add('我去就事', `日干宫${dEl}生用神宫${yEl}，须我主动出力，方有回应。`, 0.4, `生克：${dEl}生${yEl}。`);
    else if (r2 === '克') add('用神克我', `用神宫${yEl}克日干宫${dEl}，事强我弱，勉强则受伤。`, -0.9, `生克：${yEl}克${dEl}。`);
    else if (r2 === '被克') add('我克用神', `日干宫${dEl}克用神宫${yEl}，我能制事，宜主动出手。`, 0.6, `生克：${dEl}克${yEl}。`);
    else add('与我同气', `日干与用神同属${yEl}，气息相通，事在己手。`, 0.5, `同气：${dEl}与${yEl}同。`);

    // 8. 值符（大势）
    const fEl = WX_OF_PALACE[r.zhiFuPalace];
    const r3 = rel(fEl, yEl);
    if (r3 === '生') add('大势相扶', `值符落${P_NAME[r.zhiFuPalace]}（${fEl}）生用神，得上级与大势之助。`, 0.8, `生克：${fEl}生${yEl}。`);
    else if (r3 === '克') add('大势相压', `值符落${P_NAME[r.zhiFuPalace]}（${fEl}）克用神，主上不予，或环境不容。`, -0.8, `生克：${fEl}克${yEl}。`);
    else if (r3 === '被克') add('我能抗势', `用神克值符（${fEl}），能逆势而行，但费力。`, 0.2, `生克：${yEl}克${fEl}。`);
    else add('大势比和', `值符与用神同气（${fEl}），上下同心。`, 0.4, '同气。');

    // 9. 值使（门之当令，主事之枢）
    const sMen = r.zhiShiMen;
    if (sMen && MEN_LEVEL[sMen] !== undefined) {
      const lv = MEN_LEVEL[sMen];
      add('值使当令', `值使为${sMen}（${LV_NAME[lv]}门），主此事之门径在${P_NAME[r.shiShiPalace]}（${P_DIR[r.shiShiPalace]}）。`, lv * 0.4,
        '值使为时令所主之门，看办事的门径与着手处。');
    }

    // 出行：马星看动象
    if (q.key === 'travel') {
      const pMa = r.maZhi ? (typeof ZHI_PALACE !== 'undefined' ? ZHI_PALACE[r.maZhi] : null) : null;
      if (pMa) {
        add('马星动象', `马星在${P_NAME[pMa]}，${pMa === yong.p ? '正临用神之宫，动象最真，出行有成。' : '不在用神宫，动念多而落实少。'}`,
          pMa === yong.p ? 1 : -0.4, '驿马主迁移出行，临用神则动得成。');
      }
    }

    // 感情：乙（女）与庚（男）两宫生克
    if (q.key === 'love') {
      const pYi = ganPalace(r, '乙'), pGeng = ganPalace(r, '庚');
      if (pYi && pGeng) {
        const eYi = WX_OF_GAN['乙'], eGeng = WX_OF_GAN['庚'];
        const rr = rel(WX_OF_PALACE[pYi], WX_OF_PALACE[pGeng]);
        const good = rr === '生' || rr === '同';
        add('两性情势', `乙落${P_NAME[pYi]}、庚落${P_NAME[pGeng]}，` +
          (rr === '生' ? '乙宫生庚宫，一方主动付出，情势可进。' :
           rr === '同' ? '两宫同气，脾性相近，易相处。' :
           rr === '克' ? '乙宫克庚宫，一方压制另一方，易生龃龉。' :
           rr === '被克' ? '庚宫克乙宫，己方受制，话不投机。' : '两宫无涉，缘薄须牵线。'),
          good ? 0.8 : -0.8, `生克：${P_NAME[pYi]}（${WX_OF_PALACE[pYi]}）对 ${P_NAME[pGeng]}（${WX_OF_PALACE[pGeng]}）为「${rr}」。`);
      }
    }

    // 健康：另看天心（医药）落在何处
    if (q.key === 'health') {
      const pXin = xingPalace(r, '天心');
      if (pXin) {
        const ok = WX_OF_PALACE[pXin] === '金' || rel(WX_OF_PALACE[pXin], WX_OF_XING['天心']) === '生';
        add('医药之门', `天心（医药）落${P_NAME[pXin]}，${ok ? '得地，就医可托，找对医生是关键。' : '气弱，宜换医生或换治法。'}`,
          ok ? 0.6 : -0.3, '天心为医星，看医治是否得力。');
      }
    }

    // ---------- 断语 ----------
    const table = q.flip ? VERDICT.health : VERDICT.normal;
    let verdict = '', tone = 'mid';
    for (const [cut, text, t] of table) { if (score >= cut) { verdict = text; tone = t; break; } }

    const pl = WX_OF_PALACE[yong.p] ? P_NAME[yong.p] : '';
    const advice = [];
    if (q.key === 'health') {
      advice.push(`病星在${pl}（${P_DIR[yong.p]}）：症状多应在此方位所主之部位与情志，照此留意。`);
      advice.push('解盘只作参照，身体的判断交给医生；盘面用来看「何时的气最弱、该往哪个方向找助力」。');
    } else if (q.key === 'love') {
      advice.push(`和合之气在${pl}（${P_DIR[yong.p]}）：约见、沟通取此方位与此时段。`);
    } else if (tone !== 'bad') advice.push(`着手处在${pl}方（${P_DIR[yong.p]}）：面谈、签约、动身取此方位。`);
    else if (q.key !== 'health' && q.key !== 'love') advice.push(`避开${pl}方（${P_DIR[yong.p]}）办事；改为〔${P_DIR[r.zhiFuPalace]}〕一侧寻助力。`);
    if (h.includes('时空') || h.includes('日空')) advice.push('用神落空，眼下多半是「说了没落地」，等填实再动。');
    if (h.includes('入墓')) advice.push('用神入墓，事情压着不发，先处理旧账、旧关系。');
    if (info.men === '死门' || info.men === '惊门' || info.men === '伤门') advice.push(`${info.men}当事，别硬推；换门径、换人再谈。`);
    if (MEN_LEVEL[info.men] === 1) advice.push(`${info.men}当事，正当其时，可主动开口。`);

    const negs = pts.filter(x => x.w <= -0.5).sort((x, y) => x.w - y.w);
    const caveat = negs.length ? `${negs[0].text.split('，')[0]}` : '';

    return {
      q, yong, info, score, verdict, tone, pts, advice, caveat,
      yEl, dGan, dP, dEl, fEl, ws, harms: h
    };
  }

  // ---------- 跟读：六步 ----------
  function teachSteps(r, qKey) {
    const a = analyze(r, qKey);
    const steps = [];
    steps.push({
      title: '第一步 · 先看这是什么局',
      palace: null,
      body: `这是 <b>${r.isYang ? '阳遁' : '阴遁'} ${r.juInfo.ju} 局</b>，节气「${r.cur.name}」。` +
            `旬首为 <b>${r.hourXun.xunYi}</b>，值符星是 <b>${r.zhiFuXing}</b>，值使门是 <b>${r.zhiShiMen}</b>。` +
            `<br><span class="jp-dim">值符＝此局的「主事之星」，值使＝此局的「办事之门」。先记住这两个，其余都围着它们转。</span>`
    });
    steps.push({
      title: '第二步 · 找用神（问什么事，看哪个符号）',
      palace: a.yong.p,
      body: `你问的是 <b>${a.q.label}</b>。${a.q.note}` +
            `<br>此局 <b>${a.yong.name}</b> 落在 <b>${P_NAME[a.yong.p]}（${P_DIR[a.yong.p]}）</b>，那就以这一宫为「事体本身」。` +
            `<br><span class="jp-dim">用神不是神秘的东西，就是「这件事在盘上的代号」。问财看生门，问工作看开门，问病看天芮。</span>`
    });
    steps.push({
      title: '第三步 · 看这一宫的门、星、神',
      palace: a.yong.p,
      body: `用神宫上：<b>${a.info.men || '—'}</b>、<b>${a.info.tianXing || '—'}</b>、<b>${a.info.shen || '—'}</b>。` +
            `<br>门看事情的<b>性质与门径</b>，星看<b>人与气数</b>，神看<b>助力与暗情</b>。三者同吉则事顺，同凶则事事掣肘。`
    });
    steps.push({
      title: '第四步 · 看四害，气有没有被破',
      palace: a.yong.p,
      body: a.harms.length
        ? `此宫带 <b>${a.harms.join('、')}</b>。四害是「用神的伤口」：击刑——自刑受制；入墓——气数入库；门迫——门被宫克；空亡——虚而不实。`
        : `此宫四害皆无，用神清净。这是好底子：符号本身没被打断。` +
          `<br><span class="jp-dim">四害的判断标准见宫位详情里的「此宫带害」一栏。</span>`
    });
    steps.push({
      title: '第五步 · 看气数（月令）与关系（生克）',
      palace: a.yong.p,
      body: `用神属 <b>${a.yEl}</b>，${r.mP.zhi} 月为 <b>${a.ws || '—'}</b>（${a.ws ? WS_TEXT[a.ws] : ''}）。` +
            `<br>再看它跟日干宫的关系：日干 ${a.dGan} 落 ${P_NAME[a.dP]}（${a.dEl}），` +
            `与用神是 <b>${rel(a.dEl, a.yEl) === '生' ? '它生我（事来就我）' : rel(a.dEl, a.yEl) === '被生' ? '我生它（我去就事）' : rel(a.dEl, a.yEl) === '克' ? '它克我（事强我弱）' : rel(a.dEl, a.yEl) === '被克' ? '我克它（我能制事）' : '同气'} </b>。` +
            `<br><span class="jp-dim">这一层决定「是事找我，还是我追事」。前者轻松，后者要出力。</span>`
    });
    steps.push({
      title: '第六步 · 落成断语',
      palace: a.yong.p,
      body: `把上面几条加起来：门 ${MEN_LEVEL[a.info.men] ?? 0}、星 ${XING_LEVEL[a.info.tianXing] ?? 0}、神 ${SHEN_LEVEL[a.info.shen] ?? 0}、` +
            `四害 ${a.harms.length ? '有' : '无'}、月令 ${a.ws || '—'}、与日干与值符的生克。<br>` +
            `结论是 <b>${a.verdict}</b>。` +
            `<br><span class="jp-dim">这不是「算命拍板」，是把盘面上的关系读出来。同一局换个问事，用神就换，结论也跟着换。</span>`
    });
    return steps;
  }

  // ---------- 渲染 ----------
  function lvChip(level) {
    const cls = level === 1 ? 'good' : level === -1 ? 'bad' : 'mid';
    return `<span class="jp-chip ${cls}">${LV_NAME[level]}</span>`;
  }

  function render(container, r, qKey, opts) {
    if (!r) { container.innerHTML = '<div class="jp-empty">先排一局，再来看解盘。</div>'; return; }
    const a = analyze(r, qKey);
    const qButtons = Object.values(YONG).map(q =>
      `<button class="jp-q ${q.key === a.q.key ? 'on' : ''}" data-q="${q.key}" aria-pressed="${q.key === a.q.key}">`
      + `<span class="jp-tick" aria-hidden="true">${q.key === a.q.key ? '✓' : ''}</span>${q.short}</button>`).join('');

    const rows = a.pts.map(p => `
      <li class="jp-row ${p.w > 0.2 ? 'pos' : p.w < -0.2 ? 'neg' : 'neu'}">
        <span class="jp-lbl">${p.label}${a.q.flip ? '' : lvChip(p.w >= 0.6 ? 1 : p.w <= -0.5 ? -1 : 0)}</span>
        <span class="jp-txt">${p.text}</span>
        <details class="jp-why"><summary>依据</summary><div>${p.basis || '—'}</div></details>
      </li>`).join('');

    container.innerHTML = `
      <div class="jp-wrap">
        <div class="jp-qs">${qButtons}</div>

        <div class="jp-verdict ${a.tone}">
          <div class="jp-v-label">${a.q.label}</div>
          <div class="jp-v-body">
            <div class="jp-v-left">
              <div class="jp-v-main">${a.verdict}</div>
              <div class="jp-v-sub"><span>用神 <b>${a.yong.name}</b> · ${P_NAME[a.yong.p]}（${P_DIR[a.yong.p]}）</span><span>属 <b>${a.yEl}</b> · 气数 <b>${a.ws || '—'}</b></span></div>
            </div>
            <div class="jp-v-side">
              <div><i>着手方位</i><b>${P_DIR[a.yong.p]}</b></div>
              <div><i>气数</i><b>${a.ws || '—'}</b></div>
              <div><i>${a.caveat ? '所忌' : '四害'}</i><b class="${a.caveat ? 'warn' : ''}">${a.caveat || '无'}</b></div>
            </div>
          </div>
        </div>

        <div class="jp-sect">
          <h4>为什么这么断</h4>
          <ul class="jp-sum-list">${a.pts.filter(x => Math.abs(x.w) >= 0.6).map(x => `<li>${x.text}</li>`).join('')}</ul>
        </div>

        <div class="jp-sect">
          <h4>逐条看依据</h4>
          <ul class="jp-list">${rows}</ul>
        </div>

        <div class="jp-sect">
          <h4>怎么用</h4>
          <ul class="jp-adv">${a.advice.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>

        <div class="jp-sect">
          <h4>这一局怎么读出来</h4>
          <div class="jp-steps" id="jp-steps"></div>
        </div>

        <div class="jp-foot"><span class="jp-legend"><i class="pos"></i>助 <i class="neg"></i>忌 <i class="neu"></i>平</span>按传统时家奇门断法：用神落宫，看门星神吉凶、宫与用神生克、四害、月令旺衰、与日干及值符的关系。只呈现盘内关系，不作期日断言。</div>
      </div>`;

    // 跟读
    const steps = teachSteps(r, qKey);
    const stepsBox = container.querySelector('#jp-steps');
    stepsBox.innerHTML = steps.map((s, i) => `
      <details class="jp-step" ${i === 1 ? 'open' : ''}>
        <summary>${s.title}</summary>
        <div class="jp-step-body">${s.body}
          ${s.palace ? `<button class="jp-goto" data-palace="${s.palace}">在盘面上看此宫 →</button>` : ''}
        </div>
      </details>`).join('');

    // 交互
    container.querySelectorAll('.jp-q').forEach(b => b.addEventListener('click', () => {
      opts.onQuestion && opts.onQuestion(b.dataset.q);
    }));
    container.querySelectorAll('.jp-goto').forEach(b => b.addEventListener('click', () => {
      opts.onGoto && opts.onGoto(parseInt(b.dataset.palace, 10));
    }));
  }

  window.JiePan = { analyze, render, teachSteps, YONG };
})();
