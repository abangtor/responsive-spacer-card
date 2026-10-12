const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { chromium, firefox } = require('playwright-core');
const source = readFileSync('responsive-spacer-card.js', 'utf8');

(async () => {
  for (const [name, engine] of Object.entries({ chromium, firefox })) {
    const browser = await engine.launch({ headless: true,
      ...(name === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent('<style>body{margin:0}ha-card,test-room,test-entities{display:block}</style><test-room></test-room>');
      await page.addScriptTag({ content: source });
      await page.evaluate(() => {
        const room = document.querySelector('test-room');
        room.style.width = '500px';
        room.attachShadow({ mode: 'open' }).innerHTML = '<ha-card style="display:block"><test-entities style="display:block;padding:0 20px"></test-entities></ha-card>';
        const entities = room.shadowRoot.querySelector('test-entities');
        entities.attachShadow({ mode: 'open' }).innerHTML = '<ha-card style="display:block"><div id="title" style="height:66px"></div><responsive-spacer-card></responsive-spacer-card><div id="content" style="height:80px"></div></ha-card>';
        const spacer = entities.shadowRoot.querySelector('responsive-spacer-card');
        window.fixture = { room, entities, spacer, title: entities.shadowRoot.querySelector('#title') };
        window.rebuilds = 0;
        document.addEventListener('ll-rebuild', () => window.rebuilds++);
      });
      const apply = async config => {
        await page.evaluate(c => fixture.spacer.setConfig({ type: 'custom:responsive-spacer-card', ...c }), config);
        await page.waitForTimeout(80);
      };
      const measure = () => page.evaluate(() => {
        const { spacer } = fixture;
        const r = spacer.getBoundingClientRect(), source = spacer._observedElement.getBoundingClientRect();
        return { height: r.height, width: source.width, bottom: r.bottom - source.top, top: r.top - source.top };
      });
      await apply({ ratio: 0.14 });
      let m = await measure(); assert.equal(m.width, 460); assert.ok(Math.abs(m.height - 64.4) < 0.05);
      await apply({ width_source: 'card', ratio: 0.2 });
      m = await measure(); assert.equal(m.width, 460); assert.ok(Math.abs(m.height - 92) < 0.05);
      await apply({ width_source: 'parent_card', ratio: 0.2 });
      m = await measure(); assert.equal(m.width, 500); assert.ok(Math.abs(m.height - 100) < 0.05);
      await apply({ width_source: 'parent_card', height_mode: 'remaining', ratio: 0.29 });
      for (const width of [500, 374, 320, 768, 492]) {
        await page.evaluate(width => fixture.room.style.width = `${width}px`, width);
        await page.waitForTimeout(80);
        m = await measure();
        assert.ok(Math.abs(m.bottom / width - 0.29) < 0.0002, `${name}: content offset must remain proportional at ${width}px`);
      }
      // Concrete geometry expectations distinguish scaling the remaining gap
      // from scaling the target position (which would only duplicate ratio).
      for (const height_mode of ['gap', 'remaining']) {
        for (const [width, gap] of [[500, 145], [374, 108.46]]) {
          await page.evaluate(width => fixture.room.style.width = `${width}px`, width);
          const baseHeight = height_mode === 'gap' ? gap : gap - 66;
          for (const scale_factor of [0, 0.75, 1, 1.25]) {
            await apply({ width_source: 'parent_card', height_mode, ratio: 0.29, scale_factor });
            m = await measure();
            assert.ok(Math.abs(m.height - baseHeight * scale_factor) < 0.05,
              `${name}: ${height_mode} scale ${scale_factor} at ${width}px`);
          }
        }
      }
      await page.evaluate(() => fixture.room.style.width = '492px');
      // Clearing/omitting the factor resets it to 1, including after an edit.
      for (const scale_factor of [undefined, null, '']) {
        await apply({ width_source: 'parent_card', height_mode: 'remaining', ratio: 0.29, scale_factor });
        m = await measure(); assert.ok(Math.abs(m.bottom - 142.68) < 0.05);
      }
      await page.evaluate(() => fixture.title.style.height = '90px');
      await page.waitForTimeout(80);
      m = await measure(); assert.ok(Math.abs(m.bottom - 492 * 0.29) < 0.05, 'header reflow compensated');
      await apply({ width_source: 'parent_card', height_mode: 'remaining', ratio: 0.1 });
      m = await measure(); assert.equal(m.height, 0, 'never overlaps preceding content');
      await apply({ width_source: 'parent_card', height_mode: 'remaining', ratio: 0.1, min_height: 20, scale_factor: 2 });
      m = await measure(); assert.equal(m.height, 20);
      await apply({ width_source: 'parent_card', ratio: 1, max_height: 30 });
      m = await measure(); assert.equal(m.height, 30);
      await apply({ width_source: 'parent_card', ratio: 0.2, scale_factor: 0, min_height: 20 });
      m = await measure(); assert.equal(m.height, 20, 'minimum applies after zero scaling');
      await apply({ width_source: 'parent_card', height_mode: 'remaining', ratio: 0.29, scale_factor: 2, max_height: 80 });
      m = await measure(); assert.equal(m.height, 80, 'maximum applies after scaling the remaining gap');
      await apply({ width_source: 'parent_card', height_mode: 'remaining', ratio: 0.29, scale_factor: 1.1 });
      const stable = await page.evaluate(async () => {
        let writes = 0;
        const mo = new MutationObserver(records => writes += records.length);
        mo.observe(fixture.spacer.shadowRoot, { subtree: true, attributes: true });
        await new Promise(resolve => setTimeout(resolve, 200));
        mo.disconnect(); return { writes, rebuilds };
      });
      assert.deepEqual(stable, { writes: 0, rebuilds: 0 }, 'settles without resize/rebuild churn');
      await page.evaluate(() => {
        const { spacer } = fixture, parent = spacer.parentNode;
        spacer.remove(); spacer.setConfig({ ratio: 0.2, width_source: 'parent_card' });
        parent.insertBefore(spacer, parent.querySelector('#content'));
      });
      await page.waitForTimeout(80);
      m = await measure(); assert.ok(Math.abs(m.height - 98.4) < 0.05, 'reconnection restores observer');
      const failures = await page.evaluate(() => {
        return [{ scale_factor: -1 }, { scale_factor: 'invalid' }, { scale_factor: 'Infinity' }, { scale_factor: 'NaN' }, { ratio: -1 }, { width_source: 'picture' }, { height_mode: 'remaining' }, { min_height: 20, max_height: 10 }].map(config => {
          try { document.createElement('responsive-spacer-card').setConfig(config); return false; } catch { return true; }
        });
      });
      assert.ok(failures.every(Boolean), 'invalid configuration rejected');
      const editorResult = await page.evaluate(() => {
        const editor = customElements.get('responsive-spacer-card').getConfigElement();
        document.body.append(editor); editor.setConfig({ type: 'custom:responsive-spacer-card', ratio: 0.17 });
        const changes = [];
        editor.addEventListener('config-changed', event => changes.push(event.detail.config));
        const form = editor.shadowRoot.querySelector('ha-form');
        const defaultScale = form.data.scale_factor;
        editor.addEventListener('config-changed', event => fixture.spacer.setConfig(event.detail.config));
        form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { ratio: 0.29, height_mode: 'remaining' } } }));
        form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { scale_factor: 1.15 } } }));
        form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { min_height: 12 } } }));
        return { config: changes.at(-1), defaultScale, fields: form.schema.map(field => field.name) };
      });
      assert.equal(editorResult.defaultScale, 1);
      assert.equal(editorResult.config.scale_factor, 1.15);
      assert.ok(editorResult.fields.includes('scale_factor'));
      assert.equal(editorResult.config.ratio, 0.29);
      assert.equal(editorResult.config.height_mode, 'remaining');
      assert.equal(editorResult.config.width_source, 'card');
      assert.ok(editorResult.fields.includes('height_mode'));
      await page.waitForTimeout(80);
      m = await measure();
      assert.ok(Math.abs(m.height - 47.242) < 0.05, 'editor factor changes resize the preview and survive later edits');
      assert.deepEqual(errors, []);
      console.log(`${name}: responsive sizing, scale factors, fixed-header compensation, limits, lifecycle, observer stability, validation and editor events passed`);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
