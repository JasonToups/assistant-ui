import { ModalChat } from "@/components/modal/ModalChat";
import { DocsRuntimeProvider } from "../../DocsRuntimeProvider";
import { examples } from "@/app/source";
import { getMDXComponents } from "@/mdx-components";
import type { ExamplePage } from "@/app/source";

export default function Component() {
  const page = examples.getPage(["modal"]) as ExamplePage;
  const mdxComponents = getMDXComponents({});

  if (!page) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <header className="mb-28 text-center">
          <h1 className="mt-4 text-5xl font-bold">Modal</h1>
        </header>
        <div className="mb-12">
          <DocsRuntimeProvider>
            <ModalChat />
          </DocsRuntimeProvider>
        </div>
        <div className="mx-auto max-w-4xl">
          <p>Documentation not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <header className="mb-28 text-center">
        <h1 className="mt-4 text-5xl font-bold">Modal</h1>
      </header>

      <div className="mb-12">
        <DocsRuntimeProvider>
          <ModalChat />
        </DocsRuntimeProvider>
      </div>

      <div className="mx-auto max-w-4xl">
        <DocsRuntimeProvider>
          <div className="prose-gray dark:prose-invert prose max-w-none">
            <page.data.body components={mdxComponents} />
          </div>
        </DocsRuntimeProvider>
      </div>
    </div>
  );
}
