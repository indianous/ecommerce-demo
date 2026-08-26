"use client";

import { useEffect, useState } from "react";
import { Button, Card, Dialog, Heading, Icon, Image, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from "@/stores/auth.store";
import { PermissionGuard } from "@/components/employee/PermissionGuard";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { useConfirmDelete } from "@/lib/useConfirmDelete";
import { PlaceholderImageForm } from "@/components/forms/PlaceholderImageForm";
import { FaviconForm } from "@/components/forms/FaviconForm";
import { LogoForm } from "@/components/forms/LogoForm";
import { SiteMetadataForm } from "@/components/forms/SiteMetadataForm";
import { BannerForm } from "@/components/forms/BannerForm";
import { MarkdownContentForm } from "@/components/forms/MarkdownContentForm";
import { ContactForm } from "@/components/forms/ContactForm";
import { SocialLinksForm } from "@/components/forms/SocialLinksForm";
import { PaymentGatewayForm } from "@/components/forms/PaymentGatewayForm";
import { FiscalCompanyDataForm, EMPTY_FISCAL_COMPANY_DATA } from "@/components/forms/FiscalCompanyDataForm";
import { MelhorEnvioConnectionCard } from "@/components/admin/MelhorEnvioConnectionCard";
import type { Banner, FiscalCompanyData, PaymentGatewayConfig, PaymentGatewayProvider } from "@/types";

type DialogId =
  | "logo" | "placeholder" | "favicon" | "metadata"
  | "banners" | "about" | "contact"
  | "social" | "privacy" | "terms" | "refund" | "payment-gateway" | "fiscal-company-data";

export function SiteContent({ basePath = "/dashboard/site" }: { basePath?: string } = {}) {
  const { accessToken } = useAuthStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState<DialogId | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoSaving, setLogoSaving] = useState(false);

  const [placeholderUrl, setPlaceholderUrl] = useState<string | null>(null);
  const [placeholderFile, setPlaceholderFile] = useState<File | null>(null);
  const [placeholderSaving, setPlaceholderSaving] = useState(false);

  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconSaving, setFaviconSaving] = useState(false);

  const [siteTitle, setSiteTitle] = useState("");
  const [defaultDescription, setDefaultDescription] = useState("");
  const [metadataSaving, setMetadataSaving] = useState(false);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerSaving, setBannerSaving] = useState(false);

  const [aboutUsContent, setAboutUsContent] = useState("");
  const [aboutUsSaving, setAboutUsSaving] = useState(false);

  const [contactDescription, setContactDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSaving, setContactSaving] = useState(false);

  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [socialSaving, setSocialSaving] = useState(false);

  const [privacyContent, setPrivacyContent] = useState("");
  const [privacySaving, setPrivacySaving] = useState(false);

  const [termsContent, setTermsContent] = useState("");
  const [termsSaving, setTermsSaving] = useState(false);

  const [refundContent, setRefundContent] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);

  const [paymentGatewayConfig, setPaymentGatewayConfig] = useState<PaymentGatewayConfig | null>(null);
  const [paymentGatewaySelected, setPaymentGatewaySelected] = useState<PaymentGatewayProvider>("MOCK");
  const [paymentGatewaySaving, setPaymentGatewaySaving] = useState(false);
  const [paymentGatewayError, setPaymentGatewayError] = useState<string | null>(null);

  const [fiscalCompanyData, setFiscalCompanyData] = useState<FiscalCompanyData>(EMPTY_FISCAL_COMPANY_DATA);
  const [fiscalCompanyDataSaving, setFiscalCompanyDataSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/site/settings").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/site/banners").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([settings, bannersData]) => {
        if (settings) {
          setLogoUrl(settings.logoUrl ?? null);
          setPlaceholderUrl(settings.placeholderImageUrl ?? null);
          setFaviconUrl(settings.faviconUrl ?? null);
          setSiteTitle(settings.siteTitle ?? "");
          setDefaultDescription(settings.defaultDescription ?? "");
          setAboutUsContent(settings.aboutUsContent ?? "");
          setContactDescription(settings.contactDescription ?? "");
          setContactPhone(settings.contactPhone ?? "");
          setContactEmail(settings.contactEmail ?? "");
          setInstagramUrl(settings.instagramUrl ?? "");
          setTiktokUrl(settings.tiktokUrl ?? "");
          setFacebookUrl(settings.facebookUrl ?? "");
          setPrivacyContent(settings.privacyPolicyContent ?? "");
          setTermsContent(settings.termsContent ?? "");
          setRefundContent(settings.refundPolicyContent ?? "");
          setFiscalCompanyData({
            cnpj: settings.fiscalCompanyCnpj ?? "",
            legalName: settings.fiscalCompanyLegalName ?? "",
            tradeName: settings.fiscalCompanyTradeName ?? "",
            stateRegistration: settings.fiscalCompanyStateRegistration ?? "",
            taxRegime: settings.fiscalCompanyTaxRegime ?? "SIMPLES_NACIONAL",
            street: settings.fiscalCompanyStreet ?? "",
            number: settings.fiscalCompanyNumber ?? "",
            neighborhood: settings.fiscalCompanyNeighborhood ?? "",
            city: settings.fiscalCompanyCity ?? "",
            state: settings.fiscalCompanyState ?? "",
            zipCode: settings.fiscalCompanyZipCode ?? "",
            email: settings.fiscalCompanyEmail ?? "",
            phone: settings.fiscalCompanyPhone ?? "",
          });
        }
        if (Array.isArray(bannersData)) setBanners(bannersData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/site/payment-gateway", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PaymentGatewayConfig | null) => {
        if (data) {
          setPaymentGatewayConfig(data);
          setPaymentGatewaySelected(data.active);
        }
      })
      .catch(() => {});
  }, [accessToken]);

  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });
  const close = () => setOpenDialog(null);

  const handleLogoSave = async () => {
    if (!logoFile || !accessToken) return;
    setLogoSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", logoFile);
      const res = await fetch("/api/site/settings/logo", { method: "PUT", headers: authHeader(), body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      setLogoFile(null);
      close();
      toast({ variant: "success", description: "Logo atualizado com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar logo." });
    } finally { setLogoSaving(false); }
  };

  const handlePlaceholderSave = async () => {
    if (!placeholderFile || !accessToken) return;
    setPlaceholderSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", placeholderFile);
      const res = await fetch("/api/site/settings/placeholder-image", { method: "PUT", headers: authHeader(), body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlaceholderUrl(data.placeholderImageUrl);
      setPlaceholderFile(null);
      close();
      toast({ variant: "success", description: "Placeholder atualizado com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar placeholder." });
    } finally { setPlaceholderSaving(false); }
  };

  const handleFaviconSave = async () => {
    if (!faviconFile || !accessToken) return;
    setFaviconSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", faviconFile);
      const res = await fetch("/api/site/settings/favicon", { method: "PUT", headers: authHeader(), body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", description: data?.message ?? "Erro ao salvar favicon." });
        return;
      }
      setFaviconUrl(data.faviconUrl);
      setFaviconFile(null);
      close();
      toast({ variant: "success", description: "Favicon atualizado com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar favicon." });
    } finally { setFaviconSaving(false); }
  };

  const handleMetadataSave = async () => {
    if (!accessToken) return;
    setMetadataSaving(true);
    try {
      const res = await fetch("/api/site/settings/metadata", {
        method: "PUT",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ siteTitle, defaultDescription }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Metadados atualizados com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar metadados." });
    } finally { setMetadataSaving(false); }
  };

  const handleBannerSave = async () => {
    if (!bannerFile || !accessToken) return;
    setBannerSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", bannerFile);
      if (bannerLinkUrl) fd.append("linkUrl", bannerLinkUrl);
      const res = await fetch("/api/site/banners", { method: "POST", headers: authHeader(), body: fd });
      if (!res.ok) throw new Error();
      const newBanner = await res.json();
      setBanners((prev) => [...prev, newBanner]);
      setBannerFile(null);
      setBannerLinkUrl("");
      toast({ variant: "success", description: "Banner adicionado com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar banner." });
    } finally { setBannerSaving(false); }
  };

  const handleBannerRemove = async (id: string) => {
    if (!accessToken) return;
    const res = await fetch(`/api/site/banners/${id}`, { method: "DELETE", headers: authHeader() });
    if (!res.ok && res.status !== 204) {
      toast({ variant: "destructive", description: "Erro ao remover banner." });
      throw new Error();
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
    toast({ variant: "success", description: "Banner removido." });
  };

  const {
    target: bannerDeleteTarget,
    setTarget: setBannerDeleteTarget,
    deleting: bannerDeleting,
    confirm: confirmBannerDelete,
    cancel: cancelBannerDelete,
  } = useConfirmDelete(handleBannerRemove);

  const handleAboutUsSave = async () => {
    if (!accessToken) return;
    setAboutUsSaving(true);
    try {
      const res = await fetch("/api/site/settings/about-us", {
        method: "PUT", headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: aboutUsContent }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Sobre nós atualizado com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar sobre nós." });
    } finally { setAboutUsSaving(false); }
  };

  const handleContactSave = async () => {
    if (!accessToken) return;
    setContactSaving(true);
    try {
      const res = await fetch("/api/site/settings/contact", {
        method: "PUT", headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ description: contactDescription, phone: contactPhone, email: contactEmail }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Contato atualizado com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar contato." });
    } finally { setContactSaving(false); }
  };

  const handleSocialSave = async () => {
    if (!accessToken) return;
    setSocialSaving(true);
    try {
      const res = await fetch("/api/site/settings/social-links", {
        method: "PUT", headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUrl, tiktokUrl, facebookUrl }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Redes sociais atualizadas com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar redes sociais." });
    } finally { setSocialSaving(false); }
  };

  const handlePrivacySave = async () => {
    if (!accessToken) return;
    setPrivacySaving(true);
    try {
      const res = await fetch("/api/site/settings/privacy-policy", {
        method: "PUT", headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: privacyContent }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Política de privacidade atualizada com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar política de privacidade." });
    } finally { setPrivacySaving(false); }
  };

  const handleTermsSave = async () => {
    if (!accessToken) return;
    setTermsSaving(true);
    try {
      const res = await fetch("/api/site/settings/terms", {
        method: "PUT", headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: termsContent }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Termos e condições atualizados com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar termos e condições." });
    } finally { setTermsSaving(false); }
  };

  const handleRefundSave = async () => {
    if (!accessToken) return;
    setRefundSaving(true);
    try {
      const res = await fetch("/api/site/settings/refund-policy", {
        method: "PUT", headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: refundContent }),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Política de reembolso atualizada com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar política de reembolso." });
    } finally { setRefundSaving(false); }
  };

  const handlePaymentGatewaySave = async () => {
    if (!accessToken) return;
    setPaymentGatewaySaving(true);
    setPaymentGatewayError(null);
    try {
      const res = await fetch("/api/site/payment-gateway", {
        method: "PUT",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ provider: paymentGatewaySelected }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.message ?? "Erro ao trocar gateway de pagamento.";
        setPaymentGatewayError(message);
        setPaymentGatewaySelected(paymentGatewayConfig?.active ?? "MOCK");
        toast({ variant: "destructive", description: message });
        return;
      }
      setPaymentGatewayConfig(data);
      setPaymentGatewaySelected(data.active);
      close();
      toast({ variant: "success", description: "Gateway de pagamento atualizado com sucesso." });
    } catch {
      setPaymentGatewayError("Erro ao trocar gateway de pagamento.");
      setPaymentGatewaySelected(paymentGatewayConfig?.active ?? "MOCK");
      toast({ variant: "destructive", description: "Erro ao trocar gateway de pagamento." });
    } finally {
      setPaymentGatewaySaving(false);
    }
  };

  const handleFiscalCompanyDataSave = async () => {
    if (!accessToken) return;
    setFiscalCompanyDataSaving(true);
    try {
      const res = await fetch("/api/site/settings/fiscal-company-data", {
        method: "PUT",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(fiscalCompanyData),
      });
      if (!res.ok) throw new Error();
      close();
      toast({ variant: "success", description: "Dados fiscais da empresa atualizados com sucesso." });
    } catch {
      toast({ variant: "destructive", description: "Erro ao salvar dados fiscais da empresa." });
    } finally { setFiscalCompanyDataSaving(false); }
  };

  const configured = (v: string | null | undefined) =>
    v ? "Configurado" : "Não configurado";

  return (
    <PermissionGuard permissions={["MANAGE_SITE"]}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão do Site
        </Heading>

        {loading ? (
          <div role="status">
            <Skeleton variant="line" height={40} className="mb-4" />
            <Skeleton variant="line" height={120} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <section aria-labelledby="logo-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="logo-heading" size="xl">Logo da loja</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar logo" variant="primary" size="sm" onClick={() => setOpenDialog("logo")} />
                  </div>
                  <p className="text-sm text-muted-foreground">SVG utilizado como logotipo da loja.</p>
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo atual" className="h-10 rounded border object-contain" />
                    : <span className="text-xs text-muted-foreground">{configured(logoUrl)}</span>}
                </div>
              </Card>
            </section>

            <section aria-labelledby="placeholder-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="placeholder-heading" size="xl">Placeholder de produto</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar placeholder de produto" variant="primary" size="sm" onClick={() => setOpenDialog("placeholder")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Imagem exibida quando um produto não tem foto.</p>
                  {placeholderUrl
                    ? <Image src={placeholderUrl} alt="Placeholder atual" aspectRatio="video" objectFit="contain" className="max-w-[120px] rounded border" />
                    : <span className="text-xs text-muted-foreground">{configured(placeholderUrl)}</span>}
                </div>
              </Card>
            </section>

            <section aria-labelledby="favicon-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="favicon-heading" size="xl">Favicon do site</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar favicon" variant="primary" size="sm" onClick={() => setOpenDialog("favicon")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Ícone exibido na aba do navegador.</p>
                  {faviconUrl
                    ? <Image src={faviconUrl} alt="Favicon atual" className="w-8 h-8 rounded border" />
                    : <span className="text-xs text-muted-foreground">{configured(faviconUrl)}</span>}
                </div>
              </Card>
            </section>

            <section aria-labelledby="metadata-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="metadata-heading" size="xl">Metadados do site</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar metadados" variant="primary" size="sm" onClick={() => setOpenDialog("metadata")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Nome da loja e descrição padrão para SEO.</p>
                  <span className="text-xs text-muted-foreground">{siteTitle || "Não configurado"}</span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="banners-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="banners-heading" size="xl">Banners</Heading>
                    <Button iconOnly leftIcon={<Icon name="Images" size="sm" />} aria-label="Gerenciar banners" variant="primary" size="sm" onClick={() => setOpenDialog("banners")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Imagens de destaque exibidas na home.</p>
                  <span className="text-xs text-muted-foreground">
                    {banners.length > 0 ? `${banners.length} banner(s) cadastrado(s)` : "Nenhum banner"}
                  </span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="about-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="about-heading" size="xl">Sobre nós</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar sobre nós" variant="primary" size="sm" onClick={() => setOpenDialog("about")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Conteúdo da página /about-us.</p>
                  <span className="text-xs text-muted-foreground">{configured(aboutUsContent)}</span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="contact-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="contact-heading" size="xl">Contato</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar contato" variant="primary" size="sm" onClick={() => setOpenDialog("contact")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Informações exibidas na página /contact.</p>
                  <span className="text-xs text-muted-foreground">{configured(contactEmail || contactPhone)}</span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="social-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="social-heading" size="xl">Redes sociais</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar redes sociais" variant="primary" size="sm" onClick={() => setOpenDialog("social")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Links de Instagram, TikTok e Facebook.</p>
                  <span className="text-xs text-muted-foreground">
                    {[instagramUrl && "Instagram", tiktokUrl && "TikTok", facebookUrl && "Facebook"]
                      .filter(Boolean).join(", ") || "Não configurado"}
                  </span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="privacy-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="privacy-heading" size="xl">Política de privacidade</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar política de privacidade" variant="primary" size="sm" onClick={() => setOpenDialog("privacy")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Conteúdo da página /privacy-policy.</p>
                  <span className="text-xs text-muted-foreground">{configured(privacyContent)}</span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="terms-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="terms-heading" size="xl">Termos e condições</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar termos e condições" variant="primary" size="sm" onClick={() => setOpenDialog("terms")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Conteúdo da página /terms-and-conditions.</p>
                  <span className="text-xs text-muted-foreground">{configured(termsContent)}</span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="payment-gateway-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="payment-gateway-heading" size="xl">Gateway de pagamento</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar gateway de pagamento" variant="primary" size="sm" onClick={() => setOpenDialog("payment-gateway")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Gateway usado para processar pagamentos no checkout.</p>
                  <span className="text-xs text-muted-foreground">
                    {paymentGatewayConfig ? paymentGatewayConfig.active : "Carregando..."}
                  </span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="refund-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="refund-heading" size="xl">Política de reembolso</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar política de reembolso" variant="primary" size="sm" onClick={() => setOpenDialog("refund")} />
                  </div>
                  <p className="text-sm text-muted-foreground">Conteúdo da página /refund-policy.</p>
                  <span className="text-xs text-muted-foreground">{configured(refundContent)}</span>
                </div>
              </Card>
            </section>

            <section aria-labelledby="fiscal-company-data-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="fiscal-company-data-heading" size="xl">Dados fiscais da empresa</Heading>
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label="Editar dados fiscais da empresa" variant="primary" size="sm" onClick={() => setOpenDialog("fiscal-company-data")} />
                  </div>
                  <p className="text-sm text-muted-foreground">CNPJ, razão social, IE, regime tributário e endereço fiscal usados na emissão de NF-e.</p>
                  <span className="text-xs text-muted-foreground">{configured(fiscalCompanyData.cnpj)}</span>
                </div>
              </Card>
            </section>

            <section>
              <MelhorEnvioConnectionCard />
            </section>

            <section aria-labelledby="navigation-heading">
              <Card variant="outlined" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Heading as="h2" id="navigation-heading" size="xl">Navegação do site</Heading>
                    <Button iconOnly leftIcon={<Icon name="Menu" size="sm" />} aria-label="Gerenciar navegação" as="a" href={`${basePath}/navigation`} variant="primary" size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground">Links e coleções exibidos na navbar e no footer do site.</p>
                </div>
              </Card>
            </section>

          </div>
        )}

        <Dialog open={openDialog === "logo"} onClose={close} title="Logo da loja">
          <LogoForm file={logoFile} onFileChange={setLogoFile} onSave={handleLogoSave} saving={logoSaving} saveLabel="Salvar logo" />
        </Dialog>

        <Dialog open={openDialog === "placeholder"} onClose={close} title="Placeholder de produto">
          <PlaceholderImageForm file={placeholderFile} onFileChange={setPlaceholderFile} onSave={handlePlaceholderSave} saving={placeholderSaving} saveLabel="Salvar placeholder" />
        </Dialog>

        <Dialog open={openDialog === "favicon"} onClose={close} title="Favicon do site">
          <FaviconForm file={faviconFile} onFileChange={setFaviconFile} onSave={handleFaviconSave} saving={faviconSaving} saveLabel="Salvar favicon" />
        </Dialog>

        <Dialog open={openDialog === "metadata"} onClose={close} title="Metadados do site">
          <SiteMetadataForm
            siteTitle={siteTitle} defaultDescription={defaultDescription}
            onSiteTitle={setSiteTitle} onDefaultDescription={setDefaultDescription}
            onSave={handleMetadataSave} saving={metadataSaving}
            saveLabel="Salvar metadados"
          />
        </Dialog>

        <Dialog open={openDialog === "banners"} onClose={close} title="Banners" className="max-w-xl">
          {banners.length > 0 && (
            <ul className="mb-4 flex flex-col gap-2">
              {banners.map((banner) => (
                <li key={banner.id} className="flex items-center gap-3 rounded border p-2">
                  <img src={banner.imageUrl} alt="Banner" className="h-10 w-16 rounded object-cover" />
                  {banner.linkUrl && (
                    <span className="text-sm text-muted-foreground truncate flex-1">{banner.linkUrl}</span>
                  )}
                  <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label="Remover" variant="danger" size="sm" onClick={() => setBannerDeleteTarget(banner.id)} />
                </li>
              ))}
            </ul>
          )}
          <BannerForm
            file={bannerFile} linkUrl={bannerLinkUrl}
            onFileChange={setBannerFile} onLinkUrl={setBannerLinkUrl}
            onSave={handleBannerSave} saving={bannerSaving}
            saveLabel="Adicionar banner"
          />
        </Dialog>

        <ConfirmDeleteDialog
          open={bannerDeleteTarget !== null}
          onClose={cancelBannerDelete}
          onConfirm={confirmBannerDelete}
          deleting={bannerDeleting}
          title="Remover banner"
          description="Essa ação não pode ser desfeita."
        />

        <Dialog open={openDialog === "about"} onClose={close} title="Sobre nós" className="max-w-2xl">
          <MarkdownContentForm label="Conteúdo" value={aboutUsContent} onChange={setAboutUsContent} onSave={handleAboutUsSave} saving={aboutUsSaving} saveLabel="Salvar sobre nós" />
        </Dialog>

        <Dialog open={openDialog === "contact"} onClose={close} title="Contato" className="max-w-xl">
          <ContactForm
            description={contactDescription} phone={contactPhone} email={contactEmail}
            onDescription={setContactDescription} onPhone={setContactPhone} onEmail={setContactEmail}
            onSave={handleContactSave} saving={contactSaving}
            saveLabel="Salvar contato"
          />
        </Dialog>

        <Dialog open={openDialog === "social"} onClose={close} title="Redes sociais">
          <SocialLinksForm
            instagramUrl={instagramUrl} tiktokUrl={tiktokUrl} facebookUrl={facebookUrl}
            onInstagram={setInstagramUrl} onTiktok={setTiktokUrl} onFacebook={setFacebookUrl}
            onSave={handleSocialSave} saving={socialSaving}
            saveLabel="Salvar redes sociais"
          />
        </Dialog>

        <Dialog open={openDialog === "privacy"} onClose={close} title="Política de privacidade" className="max-w-2xl">
          <MarkdownContentForm label="Conteúdo" value={privacyContent} onChange={setPrivacyContent} onSave={handlePrivacySave} saving={privacySaving} saveLabel="Salvar política de privacidade" />
        </Dialog>

        <Dialog open={openDialog === "terms"} onClose={close} title="Termos e condições" className="max-w-2xl">
          <MarkdownContentForm label="Conteúdo" value={termsContent} onChange={setTermsContent} onSave={handleTermsSave} saving={termsSaving} saveLabel="Salvar termos e condições" />
        </Dialog>

        <Dialog open={openDialog === "refund"} onClose={close} title="Política de reembolso" className="max-w-2xl">
          <MarkdownContentForm label="Conteúdo" value={refundContent} onChange={setRefundContent} onSave={handleRefundSave} saving={refundSaving} saveLabel="Salvar política de reembolso" />
        </Dialog>

        <Dialog open={openDialog === "payment-gateway"} onClose={close} title="Gateway de pagamento">
          {paymentGatewayConfig && (
            <PaymentGatewayForm
              config={paymentGatewayConfig}
              value={paymentGatewaySelected}
              onChange={setPaymentGatewaySelected}
              onSave={handlePaymentGatewaySave}
              saving={paymentGatewaySaving}
              error={paymentGatewayError}
              saveLabel="Salvar gateway de pagamento"
            />
          )}
        </Dialog>

        <Dialog open={openDialog === "fiscal-company-data"} onClose={close} title="Dados fiscais da empresa" className="max-w-2xl">
          <FiscalCompanyDataForm
            data={fiscalCompanyData}
            onChange={(patch) => setFiscalCompanyData((d) => ({ ...d, ...patch }))}
            onSave={handleFiscalCompanyDataSave}
            saving={fiscalCompanyDataSaving}
            saveLabel="Salvar dados fiscais da empresa"
          />
        </Dialog>

      </main>
    </PermissionGuard>
  );
}
