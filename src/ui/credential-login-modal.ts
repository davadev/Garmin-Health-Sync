import { App, Modal, Notice, Setting } from "obsidian";
import { t } from "../i18n/t";
import type { TranslationKeys } from "../i18n/en";
import type { CredentialLoginOutcome } from "../providers/garmin/garmin-api";

export interface CredentialLoginHandlers {
	login: (email: string, password: string) => Promise<CredentialLoginOutcome>;
	verifyMfa: (code: string) => Promise<CredentialLoginOutcome>;
	/** Called after a successful login, before the modal closes. */
	onSuccess: () => Promise<void>;
	/** Opens the guided browser (paste-ticket) login instead. */
	onBrowserFallback: () => void;
	getDiagnostics: () => string;
}

const ERROR_KEYS: Record<string, TranslationKeys> = {
	invalid_credentials: "modalCredErrorInvalid",
	blocked: "modalCredErrorBlocked",
	rate_limited: "modalCredErrorBlocked",
	captcha: "modalCredErrorBlocked",
	mfa_failed: "modalCredErrorMfa",
};

/** Browser-free Garmin sign-in (email + password, optional MFA code). The password lives
 *  in a local variable for the duration of one call and is never stored or logged. */
export class CredentialLoginModal extends Modal {
	private lang: string;
	private handlers: CredentialLoginHandlers;
	private busy = false;

	constructor(app: App, lang: string, handlers: CredentialLoginHandlers) {
		super(app);
		this.lang = lang;
		this.handlers = handlers;
	}

	onOpen(): void {
		this.renderCredentials();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderCredentials(error?: string): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: t("modalCredTitle", this.lang) });
		contentEl.createEl("p", { text: t("modalCredIntro", this.lang) });
		if (error) contentEl.createEl("p", { text: error, cls: "mod-warning" });

		let email = "";
		let password = "";
		new Setting(contentEl)
			.setName(t("modalCredEmail", this.lang))
			.addText((text) => {
				text.inputEl.type = "email";
				text.inputEl.autocomplete = "username";
				text.onChange((v) => { email = v; });
			});
		new Setting(contentEl)
			.setName(t("modalCredPassword", this.lang))
			.addText((text) => {
				text.inputEl.type = "password";
				text.inputEl.autocomplete = "current-password";
				text.onChange((v) => { password = v; });
			});

		const submit = (): void => {
			if (!email.trim() || !password || this.busy) return;
			void this.run(() => this.handlers.login(email, password)).finally(() => { password = ""; });
		};
		new Setting(contentEl)
			.addButton((btn) => btn.setButtonText(t("modalCredSubmit", this.lang)).setCta().onClick(submit))
			.addButton((btn) => btn
				.setButtonText(t("modalCredBrowserFallback", this.lang))
				.onClick(() => {
					this.close();
					this.handlers.onBrowserFallback();
				}));
	}

	private renderMfa(error?: string): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: t("modalCredMfaTitle", this.lang) });
		contentEl.createEl("p", { text: t("modalCredMfaIntro", this.lang) });
		if (error) contentEl.createEl("p", { text: error, cls: "mod-warning" });

		let code = "";
		new Setting(contentEl)
			.setName(t("modalCredMfaCode", this.lang))
			.addText((text) => {
				text.inputEl.inputMode = "numeric";
				text.inputEl.autocomplete = "one-time-code";
				text.onChange((v) => { code = v; });
			});
		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText(t("modalCredSubmit", this.lang))
				.setCta()
				.onClick(() => {
					if (!code.trim() || this.busy) return;
					void this.run(() => this.handlers.verifyMfa(code));
				}));
	}

	private renderFailure(message: string): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: t("modalCredTitle", this.lang) });
		contentEl.createEl("p", { text: message, cls: "mod-warning" });
		new Setting(contentEl)
			.addButton((btn) => btn
				.setButtonText(t("modalCredBrowserFallback", this.lang))
				.setCta()
				.onClick(() => {
					this.close();
					this.handlers.onBrowserFallback();
				}))
			.addButton((btn) => btn
				.setButtonText(t("modalCredCopyDiagnostics", this.lang))
				.onClick(async () => {
					try {
						await navigator.clipboard.writeText(this.handlers.getDiagnostics());
						new Notice(t("modalCredDiagnosticsCopied", this.lang));
					} catch { /* clipboard unavailable */ }
				}))
			.addButton((btn) => btn
				.setButtonText(t("modalCredRetry", this.lang))
				.onClick(() => this.renderCredentials()));
	}

	private async run(action: () => Promise<CredentialLoginOutcome>): Promise<void> {
		this.busy = true;
		try {
			const outcome = await action();
			if (outcome.status === "ok") {
				await this.handlers.onSuccess();
				this.close();
			} else if (outcome.status === "mfa") {
				this.renderMfa();
			} else if (outcome.reason === "invalid_credentials") {
				this.renderCredentials(t("modalCredErrorInvalid", this.lang));
			} else if (outcome.reason === "mfa_failed") {
				this.renderMfa(t("modalCredErrorMfa", this.lang));
			} else {
				const key = ERROR_KEYS[outcome.reason] ?? "modalCredErrorGeneric";
				this.renderFailure(t(key, this.lang));
			}
		} catch (e: unknown) {
			console.error("Garmin Health Sync: credential login crashed", e);
			this.renderFailure(t("modalCredErrorGeneric", this.lang));
		} finally {
			this.busy = false;
		}
	}
}
