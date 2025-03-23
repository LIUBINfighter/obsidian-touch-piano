import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Piano from './piano';

// 定义视图类型常量
export const VIEW_TYPE_PLAYING = "playing-view";

export class PlayingView extends ItemView {
	static VIEW_TYPE = VIEW_TYPE_PLAYING;
	// 保存创建的 React 根对象
	private root: ReactDOM.Root;
	private midiFilePath: string | undefined;

	getViewType(): string {
		return PlayingView.VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Touch Piano";
	}

	async onOpen() {
		// 获取容器元素挂载 React 组件
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('touch-piano-container');

		// 设置默认 MIDI 文件路径
		this.midiFilePath = this.app.vault.adapter.getResourcePath(
			'obsidian-touch-piano/.obsidian/plugins/obsidian-touch-piano/src/assets/Ah-vous-dirai-je-Maman-via-Twelve-Variations.mid'
		);

		this.root = ReactDOM.createRoot(container);
		this.root.render(
			React.createElement(Piano, { 
				midiFilePath: this.midiFilePath,
				app: this.app 
			})
		);
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
		}
	}
}
