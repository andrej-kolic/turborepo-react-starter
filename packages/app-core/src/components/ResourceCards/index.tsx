import { useState } from 'react';
import { Card } from '@repo/ui';
import LinkIcon from './assets/link.svg';
import './styles.css';

// demo: throws during render, not in the click handler, because error boundaries
// only catch render errors
function ThrowButton() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Demo error from the "Error boundary" card');
  }

  return (
    <button
      type="button"
      className="Button"
      onClick={() => setShouldThrow(true)}
    >
      Throw error
    </button>
  );
}

export function ResourceCards() {
  return (
    <section
      className="ResourceCards"
      aria-label="Resources"
      data-testid="resource-cards"
    >
      <Card title="Embedded image">
        <div>{"import Icon from 'pic.svg'"}</div>
      </Card>

      <Card
        title="Public image"
        image={<img src="images/image-file.svg" alt="icon" />}
      >
        <div>{'<img src="images/pic.svg" />'}</div>
      </Card>

      <Card
        title="Css image"
        image={<div className="ResourceCards__card-image"></div>}
      >
        <div>{"background-image: url('./assets/pic.svg')"}</div>
      </Card>

      <Card
        title="Public resource"
        image={
          <img alt="" src={LinkIcon} style={{ position: 'relative', top: 3 }} />
        }
      >
        <a href="readme.txt" target="_blank" rel="noopener">
          Readme
        </a>
      </Card>

      <Card title="Error boundary" image={null}>
        <ThrowButton />
      </Card>
    </section>
  );
}
