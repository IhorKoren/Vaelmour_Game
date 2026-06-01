import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{
  title?: ReactNode;
  className?: string;
}>;

export function Panel({ title, className = '', children }: Props) {
  return (
    <section className={`panel ${className}`.trim()}>
      {title ? <h2 className="panel__title">{title}</h2> : null}
      {children}
    </section>
  );
}
