import Icon from '../../shared/Icon';
import { useToast } from './ToastProvider';

const PLACEHOLDER_CODE = '<!-- 正在准备组件代码... -->';

export default function CodeModal({ open, onClose }) {
  const { showToast } = useToast();

  const copyCode = () => {
    navigator.clipboard.writeText(PLACEHOLDER_CODE).then(() => {
      showToast('源码已成功复制！', 'success');
    });
  };

  return (
    <div
      id="codeModalBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm${open ? '' : ' hidden'} flex items-center justify-center p-4`}
    >
      <div className="bg-white dark:bg-[#16171a] border border-zinc-200 dark:border-zinc-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="code-2" className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm">组件源码导出 (Tailwind CSS / HTML5)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Icon name="copy" className="w-3.5 h-3.5" />
              一键复制
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-1 bg-zinc-950 font-mono text-xs text-zinc-300">
          <pre>
            <code id="codeModalContent">{PLACEHOLDER_CODE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
