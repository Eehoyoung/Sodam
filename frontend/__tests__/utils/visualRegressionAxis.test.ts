import {execFileSync} from 'child_process';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import {join, resolve} from 'path';

/**
 * v3 시각회귀 비교기의 <b>비교 축</b> 가드.
 *
 * <p>이 하네스는 두 가지 다른 질문에 쓰인다 — "이 변경이 화면을 깨뜨렸나"(회귀)와
 * "실 컴포넌트가 시안과 같나"(적합성). 어느 쪽인지는 두 축(캡처 모드 `source`, 커밋 SHA)
 * 중 무엇이 다른가로 정해지고, <b>둘 다 다르면 결과를 해석할 수 없다</b>.</p>
 *
 * <p>이 가드가 없어서 2026-08-13 T-14 재검증이 136 MISMATCH 를 회귀로 읽을 뻔했다.
 * 실제 회귀는 0건이었고 차이는 목업과 실화면의 문구 차이였다. 이 하네스는 지금까지
 * 거짓 초록(self-comparison)과 거짓 적색(교차 축)을 모두 낸 전력이 있어, 가드를
 * 코드가 아니라 테스트로 고정해 둔다.</p>
 */
describe('v3 시각회귀 비교 축 가드', () => {
    const script = resolve(__dirname, '../../scripts/v3-visual-regression.mjs');
    let workspace: string;

    const manifest = (source: 'reference' | 'actual', commitSha: string) =>
        JSON.stringify({formatVersion: 1, source, commitSha, dirty: false});

    /** compare 를 돌리고 {code, stderr} 를 돌려준다. 비교 대상 이미지는 필요 없다 — 가드가 먼저 걸린다. */
    const runCompare = (refSource: 'reference' | 'actual', refSha: string,
                        actSource: 'reference' | 'actual', actSha: string) => {
        const refManifest = join(workspace, 'ref-manifest.json');
        const actManifest = join(workspace, 'act-manifest.json');
        writeFileSync(refManifest, manifest(refSource, refSha));
        writeFileSync(actManifest, manifest(actSource, actSha));
        try {
            const stdout = execFileSync('node', [
                script, 'compare',
                '--out', workspace,
                '--reference-dir', join(workspace, 'ref'),
                '--actual', join(workspace, 'act'),
                '--reference-source-manifest', refManifest,
                '--actual-source-manifest', actManifest,
            ], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
            return {code: 0, output: stdout};
        } catch (e) {
            const err = e as {status: number; stdout?: string; stderr?: string};
            return {code: err.status, output: `${err.stdout ?? ''}${err.stderr ?? ''}`};
        }
    };

    beforeAll(() => {
        workspace = mkdtempSync(join(tmpdir(), 'v3-visual-axis-'));
        mkdirSync(join(workspace, 'ref'), {recursive: true});
        mkdirSync(join(workspace, 'act'), {recursive: true});
        // compare 는 기준 manifest 를 먼저 읽는다. 축 가드가 그보다 먼저 걸리는지 보려면
        // 이 파일이 유효해야 하므로 154장짜리 최소 manifest 를 만든다.
        const screens = Array.from({length: 154}, (_, i) => ({id: `screen-${i}`}));
        writeFileSync(join(workspace, 'manifest.json'),
            JSON.stringify({artifactCardCount: 154, screens}));
    });

    afterAll(() => {
        rmSync(workspace, {recursive: true, force: true});
    });

    test('캡처 모드와 커밋이 동시에 다르면 비교를 거부한다', () => {
        const {code, output} = runCompare('reference', 'aaaaaaa', 'actual', 'bbbbbbb');

        expect(code).not.toBe(0);
        expect(output).toContain('both the capture mode and the commit changed');
        // 무엇을 고쳐야 하는지가 메시지에 있어야 한다 — 이 실패를 처음 보는 사람이
        // 136개 화면을 하나씩 열어보는 데 시간을 쓰지 않도록.
        expect(output).toContain('same source, different commit');
    });

    test('소스 매니페스트가 없으면 IDENTICAL_SOURCE 로 오판하지 않는다', () => {
        // 이전 구현은 referenceSource?.commitSha === actualSource?.commitSha 였다.
        // 매니페스트를 안 넘기면 undefined === undefined 가 참이라, 평범한 compare 가
        // 전 화면을 IDENTICAL_SOURCE 로 찍고 조용히 무의미해졌다.
        let output = '';
        try {
            output = execFileSync('node', [
                script, 'compare',
                '--out', workspace,
                '--reference-dir', join(workspace, 'ref'),
                '--actual', join(workspace, 'act'),
            ], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
        } catch (e) {
            const err = e as {stdout?: string; stderr?: string};
            output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
        }

        // 요약은 들여쓰기 없이 출력된다: {"PASS":0,...,"IDENTICAL_SOURCE":154,...}
        expect(output).not.toContain('"IDENTICAL_SOURCE":154');
    });
});
