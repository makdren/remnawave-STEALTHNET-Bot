/**
 * Формирование ссылки подписки (vless://, trojan://, hy2://, ss://) по данным ноды и слота.
 */
export type NodeLinkInfo = {
    publicHost: string;
    port: number;
    protocol: string;
    tlsEnabled: boolean;
};
export type SlotLinkInfo = {
    userIdentifier: string;
    secret: string | null;
};
export declare function buildSingboxSlotSubscriptionLink(node: NodeLinkInfo, slot: SlotLinkInfo, name?: string): string;
//# sourceMappingURL=singbox-link.d.ts.map