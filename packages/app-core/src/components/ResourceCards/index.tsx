import { Card } from '@repo/ui';
import LinkIcon from './assets/link.svg';
import './styles.css';

export function ResourceCards() {
  return (
    <div className="ResourceCards">
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
        image={<img src={LinkIcon} style={{ position: 'relative', top: 3 }} />}
      >
        <a href="readme.txt" target="_blank" rel="noopener">
          Readme
        </a>
      </Card>
    </div>
  );
}
