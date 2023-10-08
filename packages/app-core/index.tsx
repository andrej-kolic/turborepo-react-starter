// component exports
// export { Card, add } from "./card";

import { Card } from "ui";
import { createRoot } from "react-dom/client";
import './styles.css';



export function init() {
  
  // const rootNode = document.getElementById("app");
  // console.log('* init2', rootNode, Card);

  // if (rootNode) {
  //   createRoot(rootNode).render(
  //     <div className="AppCore">
  //       <h1>App*</h1>
  //       <Card href="#" title="Welcome">
  //         Our new app!
  //       </Card>
  //     </div>
  //   );
  // }
}

const rootNode = document.getElementById("app");
console.log('* init', rootNode, Card);

if (rootNode) {
  createRoot(rootNode).render(
    <div className="AppCore">
      <h1>App</h1>
      <Card href="#" title="Welcome">
        Our new app!
      </Card>
    </div>
  );
}


export const a = Card;

export function AppCore(props: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}) {
  return <div style={{ border: '2px solid cyan' }}><Card {...props} /></div>
}