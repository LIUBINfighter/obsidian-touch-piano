import { ItemView, WorkspaceLeaf, TFile, Plugin } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Piano from './piano';
import TouchPianoPlugin from './main';
import * as Tone from 'tone';

// 定义视图类型常量
export const VIEW_TYPE_PLAYING = "playing-view";

export class PlayingView extends ItemView {
	constructor(leaf: WorkspaceLeaf, plugin: TouchPianoPlugin) {
		super(leaf);
		this.plugin = plugin;
	}
	static VIEW_TYPE = VIEW_TYPE_PLAYING;
	// 保存创建的 React 根对象
	private root: ReactDOM.Root;
	private midiFilePath: string | undefined;
	private plugin: TouchPianoPlugin;

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
		const defaultMidiFile = this.plugin.settings.midiFiles[0];
		this.midiFilePath = this.app.vault.adapter.getResourcePath(defaultMidiFile.path);

		this.root = ReactDOM.createRoot(container);
		this.root.render(
			React.createElement(Piano, { 
				midiFilePath: this.midiFilePath,
				app: this.app,
				plugin: this.plugin
			})
		);
	}

	async onClose() {
		// 停止所有音频播放
		Tone.Transport.stop();
		Tone.getContext().close();
		
		// 卸载React组件
		if (this.root) {
			this.root.unmount();
		}
	}
}
