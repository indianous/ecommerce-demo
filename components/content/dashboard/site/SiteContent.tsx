"use client";

import { Button, Card, Container, Heading, Icon, Skeleton } from '@indianous/base-ds'
import { PermissionGuard } from "@/components/employee/PermissionGuard";
import { useSiteSettings } from "@/lib/useSiteSettings";
import {
  SITE_HUB_GROUPS,
  SITE_SECTIONS,
  SITE_STANDALONE_PAGES,
  type SiteSection,
} from "@/lib/site-sections";
import type { SiteSettings } from "@/types";

const ALL_PAGES = [...SITE_SECTIONS, ...SITE_STANDALONE_PAGES];

function statusOf(page: (typeof ALL_PAGES)[number], settings: SiteSettings | null): string | null {
  const isConfigured = (page as SiteSection).isConfigured;
  if (!isConfigured || !settings) return null;
  return isConfigured(settings) ? "Configurado" : "Não configurado";
}

/** Índice da gestão do site: um card por função, cada uma numa página própria. */
export function SiteContent({ basePath = "/dashboard/site" }: { basePath?: string } = {}) {
  const { settings, loading } = useSiteSettings();

  return (
    <PermissionGuard permissions={["MANAGE_SITE"]}>
      <Container>
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão do Site
        </Heading>

        {loading ? (
          <div role="status">
            <Skeleton variant="line" height={40} className="mb-4" />
            <Skeleton variant="line" height={120} />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {Object.values(SITE_HUB_GROUPS).map((group) => (
              <div key={group}>
                <Heading as="h2" size="xl" className="mb-3 border-b pb-2">{group}</Heading>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ALL_PAGES.filter((page) => page.group === group).map((page) => {
                    const status = statusOf(page, settings);
                    return (
                      <section key={page.slug} aria-labelledby={`${page.slug}-heading`}>
                        <Card variant="outlined" className="h-full">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <Heading as="h3" id={`${page.slug}-heading`} size="xl">{page.title}</Heading>
                              <Button
                                leftIcon={<Icon name={page.icon} size="sm" />}
                                as="a"
                                href={`${basePath}/${page.slug}`}
                                aria-label={`Gerenciar ${page.title}`}
                                variant="primary"
                                size="sm"
                              >
                                Gerenciar
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">{page.description}</p>
                            {status && <span className="text-xs text-muted-foreground">{status}</span>}
                          </div>
                        </Card>
                      </section>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </PermissionGuard>
  );
}
