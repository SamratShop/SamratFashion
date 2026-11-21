import "react";

declare module "react" {
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    "data-toolname"?: string;
    "data-tooldescription"?: string;
  }

  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    toolparamdescription?: string;
    "data-toolparamdescription"?: string;
  }

  interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
    pubDate?: boolean | string;
    pubdate?: boolean | string;
    "data-pubdate"?: boolean | string;
  }
}
