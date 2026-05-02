import { injectAtSentinel } from './patch.js';

describe('injectAtSentinel', () => {
  it('injects a line immediately before the sentinel', () => {
    const content = `line one\n// dtk:imports\nline two`;
    const result = injectAtSentinel(content, 'imports', 'import foo from "foo";');
    expect(result).toBe(`line one\nimport foo from "foo";\n// dtk:imports\nline two`);
  });

  it('is idempotent -- does not inject if the line already exists', () => {
    const content = `import foo from "foo";\n// dtk:imports`;
    const result = injectAtSentinel(content, 'imports', 'import foo from "foo";');
    expect(result).toBe(content);
  });

  it('idempotency check trims whitespace from the line before comparing', () => {
    const content = `  import foo from "foo";\n// dtk:imports`;
    const result = injectAtSentinel(content, 'imports', '  import foo from "foo";');
    expect(result).toBe(content);
  });

  it('throws with a descriptive message if the sentinel is not found', () => {
    expect(() =>
      injectAtSentinel('no sentinel here', 'imports', 'import foo')
    ).toThrow('Sentinel not found: // dtk:imports');
  });

  it('injects multiple lines independently by calling repeatedly', () => {
    let content = `// dtk:imports`;
    content = injectAtSentinel(content, 'imports', 'import a from "a";');
    content = injectAtSentinel(content, 'imports', 'import b from "b";');
    expect(content).toContain('import a from "a";');
    expect(content).toContain('import b from "b";');
    expect(content).toContain('// dtk:imports');
  });

  it('only replaces the first occurrence of the sentinel', () => {
    const content = `// dtk:imports\n// dtk:imports`;
    const result = injectAtSentinel(content, 'imports', 'import x from "x";');
    const occurrences = (result.match(/import x from "x";/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('preserves all content outside the injection point', () => {
    const content = `import existing from "existing";\n// dtk:configs\nclass Foo {}`;
    const result = injectAtSentinel(content, 'configs', '  private x?: string;');
    expect(result).toContain('import existing from "existing";');
    expect(result).toContain('class Foo {}');
    expect(result).toContain('// dtk:configs');
  });
});
