/**
 * golmok.seoul.go.kr 사이트 구조 탐색 스크립트
 * 페이지의 주요 요소를 파악합니다.
 */

import puppeteer from 'puppeteer';

async function explore() {
  console.log('=== Golmok 사이트 탐색 ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--lang=ko-KR'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

  try {
    // 1. 메인 페이지 접속
    console.log('1. 페이지 로딩 중...');
    await page.goto('https://golmok.seoul.go.kr/owner/owner.do', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 3000));

    // 2. 페이지 구조 분석
    console.log('\n2. 페이지 구조 분석...');

    const structure = await page.evaluate(() => {
      const result: any = {
        title: document.title,
        inputs: [],
        buttons: [],
        selects: [],
        forms: [],
        importantElements: [],
      };

      // 입력 필드
      document.querySelectorAll('input').forEach(el => {
        result.inputs.push({
          id: el.id,
          name: el.name,
          type: el.type,
          placeholder: el.placeholder,
          class: el.className,
        });
      });

      // 버튼
      document.querySelectorAll('button, .btn, [role="button"]').forEach(el => {
        result.buttons.push({
          text: el.textContent?.trim().slice(0, 50),
          id: (el as HTMLElement).id,
          class: el.className,
          onclick: el.getAttribute('onclick')?.slice(0, 100),
        });
      });

      // 셀렉트
      document.querySelectorAll('select').forEach(el => {
        result.selects.push({
          id: el.id,
          name: el.name,
          options: Array.from(el.options).slice(0, 5).map(o => o.text),
        });
      });

      // 주요 섹션
      document.querySelectorAll('[class*="search"], [class*="addr"], [class*="cate"], [class*="induty"]').forEach(el => {
        result.importantElements.push({
          tag: el.tagName,
          id: (el as HTMLElement).id,
          class: el.className,
        });
      });

      return result;
    });

    console.log('\n=== 분석 결과 ===\n');
    console.log('Title:', structure.title);

    console.log('\n--- 입력 필드 ---');
    structure.inputs.slice(0, 10).forEach((inp: any) => {
      console.log(`  [${inp.type}] id="${inp.id}" name="${inp.name}" placeholder="${inp.placeholder}"`);
    });

    console.log('\n--- 버튼 ---');
    structure.buttons.slice(0, 15).forEach((btn: any) => {
      console.log(`  "${btn.text}" id="${btn.id}" onclick="${btn.onclick || 'N/A'}"`);
    });

    console.log('\n--- 셀렉트 ---');
    structure.selects.forEach((sel: any) => {
      console.log(`  id="${sel.id}" name="${sel.name}" options=[${sel.options.join(', ')}]`);
    });

    console.log('\n--- 주요 요소 ---');
    structure.importantElements.slice(0, 10).forEach((el: any) => {
      console.log(`  <${el.tag}> id="${el.id}" class="${el.class?.slice(0, 60)}"`);
    });

    // 3. 스크린샷 저장
    await page.screenshot({ path: 'golmok_explore.png', fullPage: true });
    console.log('\n스크린샷 저장: golmok_explore.png');

    // 4. 네트워크 요청 모니터링
    console.log('\n3. 네트워크 모니터링 시작 (10초)...');
    const requests: string[] = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('golmok') || url.includes('seoul.go.kr')) {
        requests.push(`${req.method()} ${url.slice(0, 100)}`);
      }
    });

    // 주소 검색 시뮬레이션
    const searchInput = await page.$('input[type="text"]');
    if (searchInput) {
      await searchInput.type('강남역');
      await new Promise(r => setTimeout(r, 1000));
    }

    await new Promise(r => setTimeout(r, 10000));

    console.log('\n--- 캡처된 요청 ---');
    requests.slice(0, 20).forEach(req => console.log(`  ${req}`));

    console.log('\n탐색 완료! 브라우저를 닫으려면 아무 키나 누르세요...');

    // 브라우저를 열어둠 (수동 탐색용)
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

explore().catch(console.error);
