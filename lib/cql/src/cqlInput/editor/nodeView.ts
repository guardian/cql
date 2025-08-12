import { Node } from "prosemirror-model";
import { NodeViewConstructor } from "prosemirror-view";
import {
  chipKey,
  chipValue,
  IS_READ_ONLY,
  IS_SELECTED,
  POLARITY,
} from "./schema";
import {
  CLASS_CHIP_KEY_READONLY,
  TEST_ID_CHIP_VALUE,
  TEST_ID_POLARITY_HANDLE,
} from "./plugins/cql";
import { removeChipCoveringRange } from "./commands";

const polarityUIMap: Record<string, string> = {
  "-": "−",
  "+": "+",
};

export const chipNodeView: NodeViewConstructor = (
  initialNode,
  view,
  getPos,
) => {
  const getNodeAtPos = (): { node: Node; pos: number } | undefined => {
    const pos = getPos();
    if (!pos) {
      return;
    }

    const $pos = view.state.doc.resolve(pos);
    const node = $pos.nodeAfter;

    return node ? { node, pos } : undefined;
  };

  const handleDeleteClickEvent = () => {
    const result = getNodeAtPos();

    if (!result) {
      return;
    }

    const { node, pos } = result;

    removeChipCoveringRange(pos, pos + node.nodeSize + 1)(view.state, view.dispatch);
  };

  const handlePolarityClickEvent = () => {
    const result = getNodeAtPos();

    if (!result) {
      return;
    }
    const newPolarity = result.node.attrs[POLARITY] === "+" ? "-" : "+";
    view.dispatch(
      view.state.tr.setNodeAttribute(result.pos, POLARITY, newPolarity),
    );
  };

  const dom = document.createElement("chip-wrapper");
  const contentDOM = document.createElement("span");
  contentDOM.classList.add("Cql__ChipWrapperContent");
  const polarityHandle = document.createElement("span");
  polarityHandle.classList.add("Cql__ChipWrapperPolarityHandle");
  polarityHandle.setAttribute("data-testid", TEST_ID_POLARITY_HANDLE);
  polarityHandle.setAttribute("contentEditable", "false");
  polarityHandle.innerHTML = polarityUIMap[initialNode.attrs[POLARITY]];
  polarityHandle.addEventListener("click", handlePolarityClickEvent);

  const deleteHandle = document.createElement("span");
  deleteHandle.classList.add("Cql__ChipWrapperDeleteHandle");
  deleteHandle.setAttribute("contentEditable", "false");
  deleteHandle.innerHTML = "×";
  deleteHandle.addEventListener("click", handleDeleteClickEvent);

  dom.appendChild(polarityHandle);
  dom.appendChild(contentDOM);
  dom.appendChild(deleteHandle);
  return {
    dom,
    contentDOM,
    update(node) {
      if (node.type !== initialNode.type) {
        return false;
      }

      polarityHandle.innerHTML = polarityUIMap[node.attrs[POLARITY]];

      if (node.attrs[IS_SELECTED]) {
        dom.classList.add("Cql__ChipWrapper--is-selected");
      } else {
        dom.classList.remove("Cql__ChipWrapper--is-selected");
      }

      return true;
    },
  };
};

export const chipKeyNodeView: NodeViewConstructor = (node) => {
  const separator = document.createElement("span");
  separator.classList.add("Cql__ChipKeySeparator");
  separator.setAttribute("contentEditable", "false");
  separator.innerText = ":";

  const addSeparator = () => {
    if (!dom.contains(separator)) {
      dom.appendChild(separator);
    }
  };

  const dom = document.createElement("chip-key");

  const contentDOM = document.createElement("span");
  dom.appendChild(contentDOM);

  if (node.attrs[IS_READ_ONLY]) {
    dom.classList.add(CLASS_CHIP_KEY_READONLY);
    dom.setAttribute("contenteditable", "false");
    addSeparator();
  }

  return {
    dom,
    contentDOM,
    update(node) {
      if (node.type !== chipKey) {
        return false;
      }
      if (node.attrs[IS_READ_ONLY]) {
        dom.classList.add(CLASS_CHIP_KEY_READONLY);
        dom.setAttribute("contenteditable", "false");
        addSeparator();
      } else {
        dom.classList.remove(CLASS_CHIP_KEY_READONLY);
        dom.setAttribute("contenteditable", "true");
      }

      return true;
    },
  };
};

export const chipValueNodeView: NodeViewConstructor = (node) => {
  const dom = document.createElement("chip-value");
  dom.setAttribute("data-testid", TEST_ID_CHIP_VALUE);

  const contentDOM = document.createElement("span");
  dom.appendChild(contentDOM);
  if (node.attrs[IS_READ_ONLY]) {
    dom.classList.add(CLASS_CHIP_KEY_READONLY);
    dom.setAttribute("contenteditable", "false");
  }

  return {
    dom,
    contentDOM,
    update(node) {
      if (node.type !== chipValue) {
        return false;
      }

      if (node.attrs[IS_READ_ONLY]) {
        dom.classList.add(CLASS_CHIP_KEY_READONLY);
        dom.setAttribute("contenteditable", "false");
      } else {
        dom.classList.remove(CLASS_CHIP_KEY_READONLY);
        dom.setAttribute("contenteditable", "true");
      }

      return true;
    },
  };
};
