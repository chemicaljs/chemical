<script>
  import { flushSync, getContext } from "svelte";
  import { cubicOut } from "svelte/easing";
  import TabScope from "./TabScope.svelte";

  const DURATION = 150;
  const EASE = "cubic-bezier(0.3333, 1, 0.6667, 1)";

  let {
    children,
    onclick = undefined,
    onauxclick = undefined,
    onkeydown = undefined,
    onpointerdown = undefined,
    ...restProps
  } = $props();

  const ctx = getContext("chemical:tabs");
  const bar = getContext("chemical:tabbar");

  let orientation = $derived(bar?.orientation ?? "horizontal");
  let vertical = $derived(orientation === "vertical");
  let pinnedTabs = $derived(ctx.list.filter((tab) => tab.pinned));
  let unpinnedTabs = $derived(ctx.list.filter((tab) => !tab.pinned));
  let rootEl = $state();
  let pinnedEl = $state();
  let trackEl = $state();

  let suppressClick = false;
  let suppressHover = $state(false);
  let resumeHoverOnMove = null;
  let stopDrag = null;
  const flipAnims = new WeakMap();

  let lastPinnedKey = "";
  let lastVertical = false;
  let pinnedSnapshot = null;
  let pinnedHeightAnim = null;
  let trackMarginAnim = null;

  $effect(() => () => stopDrag?.());

  $effect.pre(() => {
    const key = pinnedTabs.map((t) => t.id).join(",");
    const isVert = vertical;

    if (!isVert) {
      pinnedHeightAnim?.cancel();
      pinnedHeightAnim = null;
      trackMarginAnim?.cancel();
      trackMarginAnim = null;
      if (pinnedEl) pinnedEl.style.overflow = "";
    } else if (pinnedTabs.length === 0) {
      trackMarginAnim?.cancel();
      trackMarginAnim = null;
    }

    if (!isVert || !lastVertical || ctx.dragId || key === lastPinnedKey) {
      lastPinnedKey = key;
      lastVertical = isVert;
      pinnedSnapshot = null;
      return;
    }

    lastPinnedKey = key;
    lastVertical = isVert;

    if (
      !pinnedEl ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      pinnedSnapshot = null;
      return;
    }

    const slots = [
      ...pinnedEl.querySelectorAll("[data-tab-slot]:not([data-closing])"),
    ];
    const rects = new Map();
    const parentRect = pinnedEl.getBoundingClientRect();

    for (const el of slots) {
      const r = el.getBoundingClientRect();
      rects.set(el.dataset.tabId, {
        left: r.left - parentRect.left,
        top: r.top - parentRect.top,
        width: r.width,
        height: r.height,
      });
    }

    const wasHidden = getComputedStyle(pinnedEl).display === "none";
    const gap = parseFloat(getComputedStyle(rootEl).rowGap) || 0;
    pinnedSnapshot = {
      rects,
      height: wasHidden ? 0 : parentRect.height,
      marginBottom: wasHidden
        ? -gap
        : parseFloat(getComputedStyle(pinnedEl).marginBottom) || 0,
      wasEmpty: slots.length === 0,
    };
  });

  $effect(() => {
    pinnedTabs.map((t) => t.id).join(",");
    vertical;

    const snap = pinnedSnapshot;
    pinnedSnapshot = null;
    if (!snap || !pinnedEl || !vertical) return;

    const gap = parseFloat(getComputedStyle(rootEl).rowGap) || 0;

    pinnedHeightAnim?.cancel();
    pinnedHeightAnim = null;
    pinnedEl.style.overflow = "";

    const slots = [
      ...pinnedEl.querySelectorAll("[data-tab-slot]:not([data-closing])"),
    ];
    for (const el of slots) {
      flipAnims.get(el)?.cancel();
      flipAnims.delete(el);
    }

    const nextCount = slots.length;
    const parentRect = pinnedEl.getBoundingClientRect();
    const nextHeight = nextCount === 0 ? 0 : parentRect.height;
    const nextMarginBottom = nextCount === 0 ? -gap : 0;

    if (
      Math.abs(snap.height - nextHeight) >= 0.5 ||
      Math.abs(snap.marginBottom - nextMarginBottom) >= 0.5
    ) {
      pinnedEl.style.overflow = "hidden";
      const anim = pinnedEl.animate(
        [
          {
            height: `${snap.height}px`,
            marginBottom: `${snap.marginBottom}px`,
          },
          {
            height: `${nextHeight}px`,
            marginBottom: `${nextMarginBottom}px`,
          },
        ],
        {
          duration: DURATION,
          easing: EASE,
          fill: nextCount === 0 ? "forwards" : "none",
        },
      );
      pinnedHeightAnim = anim;
      anim.onfinish = () => {
        if (pinnedHeightAnim === anim && nextCount > 0) {
          pinnedHeightAnim = null;
          pinnedEl.style.overflow = "";
        }
      };
    }

    const prevMaxTop = [...snap.rects.values()].reduce(
      (max, r) => Math.max(max, r.top),
      -1,
    );

    for (const el of slots) {
      const id = el.dataset.tabId;
      const next = el.getBoundingClientRect();
      const nextLeft = next.left - parentRect.left;
      const nextTop = next.top - parentRect.top;
      const prev = snap.rects.get(id);

      if (prev) {
        const dx = prev.left - nextLeft;
        const dy = prev.top - nextTop;
        if (
          Math.abs(dx) < 0.5 &&
          Math.abs(dy) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5
        ) {
          continue;
        }
        flipAnims.set(
          el,
          el.animate(
            [
              {
                transform: `translate(${dx}px, ${dy}px)`,
                width: `${prev.width}px`,
              },
              {
                transform: "none",
                width: `${next.width}px`,
              },
            ],
            { duration: DURATION, easing: EASE },
          ),
        );
      } else if (!snap.wasEmpty && nextTop <= prevMaxTop + 1) {
        const isLast = el === slots[slots.length - 1];
        const shiftX = isLast ? next.width : next.width / 2;
        flipAnims.set(
          el,
          el.animate(
            [
              {
                opacity: 0,
                width: "0px",
                transform: `translateX(${shiftX}px)`,
                overflow: "hidden",
              },
              {
                opacity: 1,
                width: `${next.width}px`,
                transform: "none",
                overflow: "hidden",
              },
            ],
            { duration: DURATION, easing: EASE },
          ),
        );
      } else {
        flipAnims.set(
          el,
          el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: DURATION,
            easing: EASE,
          }),
        );
      }
    }
  });

  function stopHoverSuppression() {
    if (resumeHoverOnMove) {
      window.removeEventListener("pointermove", resumeHoverOnMove);
      resumeHoverOnMove = null;
    }
    suppressHover = false;
  }

  function reorderWithAnimation(from, to, draggedSlot, container) {
    const slots = [
      ...container.querySelectorAll("[data-tab-slot]:not([data-closing])"),
    ];
    const before = new Map(
      slots.map((el) => {
        const rect = el.getBoundingClientRect();
        return [el, { x: rect.left, y: rect.top }];
      }),
    );

    flushSync(() => ctx.reorder(from, to));

    for (const el of slots) {
      flipAnims.get(el)?.cancel();
      flipAnims.delete(el);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const [el, prev] of before) {
      if (el === draggedSlot) continue;
      const rect = el.getBoundingClientRect();
      const dx = prev.x - rect.left;
      const dy = prev.y - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      flipAnims.set(
        el,
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: DURATION, easing: EASE },
        ),
      );
    }
  }

  function startDrag(e, tab) {
    onpointerdown?.(e);
    const pinned = Boolean(tab.pinned);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      !ctx.reorderable ||
      ctx.list.filter((item) => Boolean(item.pinned) === pinned).length < 2 ||
      e.target.closest?.("button, a, input, select, textarea")
    ) {
      return;
    }

    const slot = e.currentTarget.parentElement;
    const isGrid = vertical && pinned;
    const container = isGrid ? pinnedEl : vertical ? trackEl : rootEl;
    if (!container) return;

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = slot.offsetLeft;
    const startOffsetY = slot.offsetTop;
    const startScrollX = container.scrollLeft;
    const startScrollY = container.scrollTop;
    let lastX = startX;
    let lastY = startY;
    let moved = false;
    let scrollFrame = 0;

    function moveTab(ev) {
      if (ev.pointerId !== pointerId) return;
      lastX = ev.clientX;
      lastY = ev.clientY;

      if (!moved) {
        if (Math.hypot(lastX - startX, lastY - startY) < 4) return;
        moved = true;
        ctx.select(tab.id);
        ctx.dragId = tab.id;
        slot.style.zIndex = "2";
        slot.style.cursor = "grabbing";
        slot.style.willChange = "transform";
        window.getSelection()?.removeAllRanges();
        scrollFrame = requestAnimationFrame(autoScroll);
      }

      ev.preventDefault();
      updateDrag(ev);
    }

    function updateDrag(ev) {
      const index = ctx.list.findIndex((item) => item.id === tab.id);
      if (index < 0 || !container) return;

      const getSlots = () =>
        [
          ...container.querySelectorAll("[data-tab-slot]:not([data-closing])"),
        ].filter((el) => el.hasAttribute("data-pinned") === pinned);

      const positionSlot = () => {
        const slots = getSlots();

        if (isGrid) {
          const desiredX =
            ev.clientX -
            startX +
            (container.scrollLeft - startScrollX) -
            (slot.offsetLeft - startOffsetX);
          const desiredY =
            ev.clientY -
            startY +
            (container.scrollTop - startScrollY) -
            (slot.offsetTop - startOffsetY);
          const dx = Math.max(
            -slot.offsetLeft,
            Math.min(
              container.clientWidth - slot.offsetWidth - slot.offsetLeft,
              desiredX,
            ),
          );
          const dy = Math.max(
            -slot.offsetTop,
            Math.min(
              container.scrollHeight - slot.offsetHeight - slot.offsetTop,
              desiredY,
            ),
          );
          slot.style.transform = `translate(${dx}px, ${dy}px)`;
          return {
            slots,
            centerX: slot.offsetLeft + dx + slot.offsetWidth / 2,
            centerY: slot.offsetTop + dy + slot.offsetHeight / 2,
          };
        }

        const point = vertical ? ev.clientY : ev.clientX;
        const start = vertical ? startY : startX;
        const startPosition = vertical ? startOffsetY : startOffsetX;
        const startScroll = vertical ? startScrollY : startScrollX;
        const currentOrigin = vertical ? slot.offsetTop : slot.offsetLeft;
        const currentScroll = vertical
          ? container.scrollTop
          : container.scrollLeft;
        const first = slots[0];
        const last = slots[slots.length - 1];
        const startEdge = vertical ? first.offsetTop : first.offsetLeft;
        const endEdge = vertical
          ? last.offsetTop + last.offsetHeight
          : last.offsetLeft + last.offsetWidth;
        const size = vertical ? slot.offsetHeight : slot.offsetWidth;
        const desired =
          point -
          start +
          (currentScroll - startScroll) -
          (currentOrigin - startPosition);
        const min = startEdge - currentOrigin;
        const max = endEdge - size - currentOrigin;
        const offset = Math.max(min, Math.min(max, desired));
        slot.style.transform = `translate${vertical ? "Y" : "X"}(${offset}px)`;
        return {
          slots,
          dragStart: currentOrigin + offset,
          dragEnd: currentOrigin + offset + size,
        };
      };

      const pos = positionSlot();
      const { slots } = pos;
      const localIndex = slots.indexOf(slot);
      if (localIndex < 0) return;

      let localTarget = localIndex;

      if (isGrid) {
        for (let i = 0; i < slots.length; i++) {
          if (i === localIndex) continue;
          const s = slots[i];
          if (
            pos.centerX >= s.offsetLeft &&
            pos.centerX <= s.offsetLeft + s.offsetWidth &&
            pos.centerY >= s.offsetTop &&
            pos.centerY <= s.offsetTop + s.offsetHeight
          ) {
            localTarget = i;
            break;
          }
        }
        if (localTarget === localIndex && slots.length) {
          const last = slots[slots.length - 1];
          if (
            pos.centerY >= last.offsetTop &&
            pos.centerX > last.offsetLeft + last.offsetWidth
          ) {
            localTarget = slots.length - 1;
          }
        }
      } else {
        for (let i = 0; i < slots.length; i++) {
          if (i === localIndex) continue;
          const mid = vertical
            ? slots[i].offsetTop + slots[i].offsetHeight / 2
            : slots[i].offsetLeft + slots[i].offsetWidth / 2;
          if (i > localIndex && pos.dragEnd > mid) localTarget = i;
          else if (i < localIndex && pos.dragStart < mid) {
            localTarget = i;
            break;
          }
        }
      }

      if (localTarget !== localIndex) {
        const targetId = slots[localTarget]?.dataset.tabId;
        const target = ctx.list.findIndex((item) => item.id === targetId);
        if (target >= 0 && target !== index) {
          reorderWithAnimation(index, target, slot, container);
          positionSlot();
        }
      }
    }

    function autoScroll() {
      if (!moved || !container) return;

      const rect = container.getBoundingClientRect();
      const point = vertical ? lastY : lastX;
      const start = vertical ? rect.top : rect.left;
      const end = vertical ? rect.bottom : rect.right;
      const edge = 32;
      let amount = 0;

      if (point < start + edge) {
        amount = -Math.min(18, (start + edge - point) * 0.35 + 4);
      } else if (point > end - edge) {
        amount = Math.min(18, (point - (end - edge)) * 0.35 + 4);
      }

      if (amount) {
        if (vertical) container.scrollTop += amount;
        else container.scrollLeft += amount;
        updateDrag({ clientX: lastX, clientY: lastY });
      }
      scrollFrame = requestAnimationFrame(autoScroll);
    }

    function finishDrag(ev) {
      if (ev?.pointerId !== undefined && ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", moveTab);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      window.removeEventListener("blur", finishDrag);
      cancelAnimationFrame(scrollFrame);
      stopDrag = null;
      if (!moved) return;

      ctx.dragId = null;
      slot.style.transition = `transform ${DURATION}ms ${EASE}`;
      slot.style.transform = "";
      const cleanup = () => {
        slot.style.transition = "";
        slot.style.zIndex = "";
        slot.style.cursor = "";
        slot.style.willChange = "";
      };
      slot.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 180);

      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);

      suppressHover = true;
      resumeHoverOnMove = (moveEvent) => {
        if (moveEvent.clientX === lastX && moveEvent.clientY === lastY) return;
        stopHoverSuppression();
      };
      window.addEventListener("pointermove", resumeHoverOnMove);
    }

    stopDrag?.();
    stopDrag = finishDrag;
    window.addEventListener("pointermove", moveTab);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    window.addEventListener("blur", finishDrag);
  }

  function revealSlot(node) {
    const container = vertical ? node?.parentElement : rootEl;
    if (!container || !node) return;
    if (vertical) {
      const top = node.offsetTop;
      const bottom = top + node.offsetHeight;
      if (top < container.scrollTop) {
        container.scrollTop = top;
      } else if (bottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = bottom - container.clientHeight;
      }
    } else {
      const left = node.offsetLeft;
      const right = left + node.offsetWidth;
      if (left < container.scrollLeft) {
        container.scrollLeft = left;
      } else if (right > container.scrollLeft + container.clientWidth) {
        container.scrollLeft = right - container.clientWidth;
      }
    }
  }

  function scrollActive(node, { active, pinned }) {
    let prevActive = active;
    let prevPinned = pinned;
    if (active && !ctx.dragId) revealSlot(node);
    return {
      update(next) {
        if (
          next.active &&
          (next.active !== prevActive || next.pinned !== prevPinned) &&
          !ctx.dragId
        ) {
          revealSlot(node);
        }
        prevActive = next.active;
        prevPinned = next.pinned;
      },
    };
  }

  function tabTransition(node, { id, pinned, out = false }) {
    if (out) node.dataset.closing = "";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return { duration: 0 };
    }

    const isVertical = vertical;
    const style = getComputedStyle(node);
    const opacity = parseFloat(style.opacity) || 1;
    const tick = out
      ? undefined
      : () => {
          if (ctx.activeId === id && !ctx.dragId) revealSlot(node);
        };

    if (isVertical && pinned) {
      if (!out) return { duration: 0 };

      flipAnims.get(node)?.cancel();
      flipAnims.delete(node);

      const rect = pinnedSnapshot?.rects.get(id) ?? {
        left: node.offsetLeft,
        top: node.offsetTop,
        width: node.offsetWidth,
        height: node.offsetHeight,
      };
      const allRects = pinnedSnapshot
        ? [...pinnedSnapshot.rects.entries()]
        : [];
      const sameRowOthers = allRects
        .filter(([k, r]) => k !== id && Math.abs(r.top - rect.top) < 2)
        .map(([, r]) => r);
      const singleRow = allRects.every(([, r]) => r.top < 2);
      const hasRightSibling = sameRowOthers.some((r) => r.left > rect.left);

      Object.assign(node.style, {
        position: "absolute",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: "0",
        pointerEvents: "none",
        overflow: "hidden",
      });

      if (!sameRowOthers.length) {
        return {
          duration: DURATION,
          easing: cubicOut,
          css: (t) => `opacity: ${t * t * opacity};`,
        };
      }

      if (singleRow && !hasRightSibling) {
        return {
          duration: DURATION,
          easing: cubicOut,
          css: (t, u) =>
            `opacity: ${t * t * opacity};` +
            `width: ${t * rect.width}px;` +
            `transform: translateX(${u * rect.width}px);`,
        };
      }

      return {
        duration: DURATION,
        easing: cubicOut,
        css: (t) =>
          `opacity: ${t * t * opacity};` + `width: ${t * rect.width}px;`,
      };
    }

    const container = isVertical ? node.parentElement : rootEl;
    const parentStyle = container ? getComputedStyle(container) : null;
    const gap =
      parseFloat(isVertical ? parentStyle?.rowGap : parentStyle?.columnGap) ||
      0;

    if (isVertical && !pinned && trackEl && pinnedTabs.length > 0 && gap) {
      if (out && unpinnedTabs.length === 0) {
        const from = parseFloat(getComputedStyle(trackEl).marginTop) || 0;
        trackMarginAnim?.cancel();
        trackMarginAnim = trackEl.animate(
          [{ marginTop: `${from}px` }, { marginTop: `${-gap}px` }],
          { duration: DURATION, easing: EASE, fill: "forwards" },
        );
      } else if (!out && unpinnedTabs.length === 1) {
        const wasHidden = !trackMarginAnim;
        const from = wasHidden
          ? -gap
          : parseFloat(getComputedStyle(trackEl).marginTop) || 0;
        trackMarginAnim?.cancel();
        const anim = trackEl.animate(
          [{ marginTop: `${from}px` }, { marginTop: "0px" }],
          { duration: DURATION, easing: EASE },
        );
        trackMarginAnim = anim;
        anim.onfinish = () => {
          if (trackMarginAnim === anim) trackMarginAnim = null;
        };
      }
    }

    const siblings = container
      ? [...container.querySelectorAll("[data-tab-slot]")]
      : [];
    const idx = siblings.indexOf(node);
    const marginProp =
      idx > 0
        ? isVertical
          ? "margin-top"
          : "margin-left"
        : idx >= 0 && idx < siblings.length - 1
          ? isVertical
            ? "margin-bottom"
            : "margin-right"
          : null;

    if (isVertical) {
      const height = node.getBoundingClientRect().height;
      return {
        duration: DURATION,
        easing: cubicOut,
        css: (t, u) =>
          `overflow: hidden;` +
          `opacity: ${t * t * opacity};` +
          `height: ${t * height}px;` +
          `min-height: 0;` +
          `max-height: ${t * height}px;` +
          (marginProp && gap ? `${marginProp}: ${-u * gap}px;` : ""),
        tick,
      };
    }

    const flexGrow = parseFloat(style.flexGrow) || 0;
    const flexShrink = parseFloat(style.flexShrink) || 0;
    const basis = style.flexBasis.endsWith("px")
      ? parseFloat(style.flexBasis)
      : node.getBoundingClientRect().width;
    const minWidth = style.minWidth.endsWith("px")
      ? parseFloat(style.minWidth)
      : 0;
    const maxWidth = style.maxWidth.endsWith("px")
      ? parseFloat(style.maxWidth)
      : NaN;

    return {
      duration: DURATION,
      easing: cubicOut,
      css: (t, u) =>
        `overflow: hidden;` +
        `opacity: ${t * t * opacity};` +
        `flex-grow: ${t * flexGrow};` +
        `flex-shrink: ${flexShrink};` +
        `flex-basis: ${t * basis}px;` +
        `min-width: ${t * minWidth}px;` +
        (Number.isFinite(maxWidth) ? `max-width: ${t * maxWidth}px;` : "") +
        (marginProp && gap ? `${marginProp}: ${-u * gap}px;` : ""),
      tick,
    };
  }

  function handleTabKeydown(e, tab) {
    if (!e.defaultPrevented && ctx.list.length) {
      const { key } = e;
      const index = ctx.list.findIndex((item) => item.id === tab.id);
      const length = ctx.list.length;
      const nextMap = {
        [vertical ? "ArrowDown" : "ArrowRight"]: (index + 1) % length,
        [vertical ? "ArrowUp" : "ArrowLeft"]: (index - 1 + length) % length,
        Home: 0,
        End: length - 1,
      };
      if (vertical && tab.pinned) {
        nextMap.ArrowRight = (index + 1) % length;
        nextMap.ArrowLeft = (index - 1 + length) % length;
      }

      const next = nextMap[key];
      if (next !== undefined) {
        e.preventDefault();
        ctx.select(ctx.list[next].id);
        flushSync();
        rootEl
          ?.querySelector(`[data-tab-id="${ctx.list[next].id}"] [role="tab"]`)
          ?.focus();
      }
    }
    onkeydown?.(e);
  }

  function handleWheel(e) {
    if (vertical) return;
    const el = e.currentTarget;
    if (
      el.scrollWidth > el.clientWidth &&
      Math.abs(e.deltaY) > Math.abs(e.deltaX)
    ) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }
</script>

{#snippet tabSlot(tab)}
  {@const active = ctx.activeId === tab.id}
  {@const dragging = ctx.dragId === tab.id}
  {@const pinned = Boolean(tab.pinned)}
  <div
    data-tab-slot=""
    data-tab-id={tab.id}
    data-pinned={pinned || undefined}
    in:tabTransition={{ id: tab.id, pinned }}
    out:tabTransition={{ id: tab.id, pinned, out: true }}
    onintroend={(e) => {
      if (ctx.activeId === tab.id && !ctx.dragId) {
        revealSlot(e.currentTarget);
      }
    }}
    onoutrostart={(e) => {
      e.currentTarget.dataset.closing = "";
    }}
    onoutroend={(e) => {
      if (
        e.currentTarget.parentElement === trackEl &&
        unpinnedTabs.length === 0 &&
        [...trackEl.children].every((el) => el === e.currentTarget)
      ) {
        trackMarginAnim?.cancel();
        trackMarginAnim = null;
      }
    }}
    use:scrollActive={{ active, pinned }}
  >
    <div
      role="tab"
      id={`chemical-tab-${tab.id}`}
      aria-controls={`chemical-panel-${tab.id}`}
      draggable="false"
      tabindex={active ? 0 : -1}
      aria-selected={active}
      data-active={active || undefined}
      data-dragging={dragging || undefined}
      data-pinned={pinned || undefined}
      onpointerdown={(e) => startDrag(e, tab)}
      onclick={(e) => {
        if (suppressClick) return;
        ctx.select(tab.id);
        onclick?.(e);
      }}
      onauxclick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          ctx.close(tab.id);
        }
        onauxclick?.(e);
      }}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.select(tab.id);
        }
        handleTabKeydown(e, tab);
      }}
      {...restProps}
    >
      <TabScope {tab} {children} />
    </div>
  </div>
{/snippet}

<div
  bind:this={rootEl}
  role="none"
  data-orientation={orientation}
  data-dragging={ctx.dragId ? "" : undefined}
  data-suppress-hover={suppressHover || undefined}
  onwheel={handleWheel}
>
  <div bind:this={pinnedEl} data-tab-pinned="">
    {#each pinnedTabs as tab (tab.id)}{@render tabSlot(tab)}{/each}
  </div>
  <div bind:this={trackEl} data-tab-track="">
    {#each unpinnedTabs as tab (tab.id)}{@render tabSlot(tab)}{/each}
  </div>
</div>

<style>
  div[role="none"] {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: inherit;
    gap: inherit;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  div[role="none"][data-orientation="vertical"] {
    flex-direction: column;
    min-height: 0;
    max-height: 100%;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  div[role="none"]::-webkit-scrollbar,
  div[data-tab-track]::-webkit-scrollbar {
    display: none;
  }

  div[data-tab-pinned],
  div[data-tab-track] {
    display: contents;
  }

  div[role="none"][data-orientation="vertical"] > div[data-tab-pinned] {
    position: relative;
    display: grid;
    grid-auto-rows: max-content;
    align-content: start;
    gap: inherit;
    flex: 0 0 auto;
  }

  :where(div[role="none"][data-orientation="vertical"] > div[data-tab-pinned]) {
    grid-template-columns: repeat(auto-fit, minmax(1.875rem, 1fr));
  }

  div[role="none"][data-orientation="vertical"] > div[data-tab-track] {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: inherit;
    flex: 0 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: none;
  }

  div[role="none"][data-orientation="vertical"] > div[data-tab-pinned]:empty,
  div[role="none"][data-orientation="vertical"] > div[data-tab-track]:empty {
    display: none;
  }

  div[data-tab-slot] {
    display: flex;
    align-items: stretch;
    overflow: hidden;
  }

  div[data-tab-slot][data-closing] {
    pointer-events: none;
  }

  :where(div[data-tab-slot]) {
    width: 14rem;
    flex: 1 1 14rem;
    min-width: 2.25rem;
    max-width: 14rem;
  }

  :where(div[data-tab-slot][data-pinned]) {
    width: 2.25rem;
    flex: 0 0 2.25rem;
    min-width: 2.25rem;
    max-width: 2.25rem;
  }

  div[role="none"][data-orientation="vertical"] div[data-tab-slot] {
    align-items: flex-end;
    width: 100%;
    flex: 0 0 auto;
    min-width: 0;
    max-width: none;
  }

  div[role="none"][data-orientation="vertical"]
    > div[data-tab-pinned]
    > div[data-tab-slot] {
    align-items: stretch;
    overflow: visible;
  }

  div[role="tab"] {
    position: relative;
    container-type: inline-size;
    overflow: hidden;
    width: 100%;
    flex: 1 1 auto;
    min-width: 0;
  }

  :where(div[role="tab"]) {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    user-select: none;
  }

  div[role="tab"][data-pinned] {
    justify-content: center;
    gap: 0;
    padding-inline: 0;
  }

  div[role="tab"][data-pinned] > :global([data-tab-title]),
  div[role="tab"][data-pinned] > :global([data-tab-close]) {
    display: none;
  }

  :where(div[role="tab"][data-dragging]) {
    cursor: grabbing;
  }

  div[role="none"][data-dragging] [role="tab"],
  div[role="none"][data-suppress-hover] [role="tab"] {
    pointer-events: none;
  }

  @container (max-width: 3.25rem) {
    div[role="tab"][data-active]:hover:not([data-dragging]):not([data-pinned])
      > :global(:not([data-tab-close])) {
      visibility: hidden;
      pointer-events: none;
    }
  }
</style>
