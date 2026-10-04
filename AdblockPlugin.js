import * as Scramjet from "@mercuryworkshop/scramjet";
import * as ScramjetController from "@mercuryworkshop/scramjet-controller";

const { BareResponse } = Scramjet;
const { ManagedPlugin } = ScramjetController;

export class AdblockPlugin extends ManagedPlugin {
  constructor(options = {}) {
    super("scramjet-adblock", []);
    this.enabled = options.enabled ?? true;
    this.blockedStatus = options.blockedStatus ?? 204;
    this.onBlock = options.onBlock;
    this._blockedCount = 0;
    this.blockedDomains = new Set();
    this.patternRules = [];

    if (options.rules) {
      this.addRules(options.rules);
    }

    if (options.rawRulesets) {
      for (const raw of options.rawRulesets) {
        this.parseAndAddRawRuleset(raw);
      }
    }
  }

  get blockedCount() {
    return this._blockedCount;
  }

  resetCount() {
    this._blockedCount = 0;
  }

  addRules(rules) {
    for (const rawRule of rules) {
      const rule = rawRule.trim().toLowerCase();
      if (!rule || rule.startsWith("#") || rule.startsWith("!")) continue;

      if (rule.startsWith("/") && rule.endsWith("/") && rule.length > 2) {
        try {
          this.patternRules.push({
            raw: rule,
            regex: new RegExp(rule.slice(1, -1), "i"),
          });
        } catch (err) {
          console.warn(`[scramjet-adblock] Invalid regex rule "${rule}":`, err);
        }
        continue;
      }

      if (rule.includes("*") || rule.includes("?")) {
        const regexStr = rule
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".");
        this.patternRules.push({
          raw: rule,
          regex: new RegExp(`^${regexStr}$`, "i"),
        });
        continue;
      }

      this.blockedDomains.add(rule);
    }
  }

  parseAndAddRawRuleset(content) {
    const lines = content.split(/\r?\n/);
    const extracted = [];

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#") || line.startsWith("!")) continue;

      if (line.startsWith("127.0.0.1") || line.startsWith("0.0.0.0")) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && parts[1] !== "localhost") {
          extracted.push(parts[1]);
        }
        continue;
      }

      if (line.startsWith("||")) {
        const domain = line.slice(2).replace(/\^.*$/, "");
        if (domain) extracted.push(domain);
        continue;
      }

      extracted.push(line);
    }

    this.addRules(extracted);
  }

  removeRule(rule) {
    const clean = rule.trim().toLowerCase();
    this.blockedDomains.delete(clean);
    this.patternRules = this.patternRules.filter((r) => r.raw !== clean);
  }

  clearRules() {
    this.blockedDomains.clear();
    this.patternRules = [];
  }

  isBlocked(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const fullUrl = parsed.href.toLowerCase();

      if (this.blockedDomains.has(hostname)) {
        return { blocked: true, matchedRule: hostname };
      }

      const parts = hostname.split(".");
      for (let i = 1; i < parts.length - 1; i++) {
        const parentDomain = parts.slice(i).join(".");
        if (this.blockedDomains.has(parentDomain)) {
          return { blocked: true, matchedRule: parentDomain };
        }
      }

      for (const { raw, regex } of this.patternRules) {
        if (regex.test(hostname) || regex.test(fullUrl)) {
          return { blocked: true, matchedRule: raw };
        }
      }
    } catch {}

    return { blocked: false };
  }

  install(frame) {
    super.install(frame);

    const hooks = frame.fetchHandler.hooks.fetch;

    this.tap(hooks.request, async (ctx, props) => {
      if (!this.enabled) return;
      if (props.earlyResponse) return;

      const targetUrl = ctx.parsed.url.href;
      const { blocked, matchedRule } = this.isBlocked(targetUrl);

      if (blocked) {
        this._blockedCount++;
        if (this.onBlock && matchedRule) {
          this.onBlock(targetUrl, matchedRule);
        }

        props.earlyResponse = BareResponse.fromNativeResponse(
          new Response(null, {
            status: this.blockedStatus,
            statusText: "Blocked by Scramjet Adblock",
            headers: new Headers({
              "x-scramjet-blocked-by": "adblock-plugin",
            }),
          }),
        );
      }
    });
  }
}
