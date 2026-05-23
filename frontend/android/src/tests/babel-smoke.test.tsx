import React from 'react';

// Simple JSX smoke test to ensure Babel automatic runtime works without legacy plugins
const Foo: React.FC = () => <></>;

describe('Babel JSX automatic runtime smoke', () => {
  it('creates a JSX element without transform errors (duplicate __self)', () => {
    const element = <Foo />;
    expect(element).toBeTruthy();
  });
});
