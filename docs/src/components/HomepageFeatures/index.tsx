import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
  to: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'AI',
    Svg: require('@site/static/img/ai.svg').default,
    description: (
      <>
        Caiz.dev uses AI to make communication more active and smooth.
      </>
    ),
    to: '/docs/features/ai',
  },
  {
    title: 'One ID',
    Svg: require('@site/static/img/id.svg').default,
    description: (
      <>
        Caiz.dev allows you to join multiple communities with a single ID.
      </>
    ),
    to: '/docs/features/id',
  },
  {
    title: 'Opensource',
    Svg: require('@site/static/img/oss.svg').default,
    description: (
      <>
        Caiz.dev is based on NodeBB and is entirely open-source.
      </>
    ),
    to: '/docs/features/opensource',
  },
];

function Feature({title, Svg, description, to}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <a href={to} className="button button--secondary">
          Learn More
        </a>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
