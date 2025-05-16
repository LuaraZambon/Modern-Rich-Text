        class RichTextEditor {
            constructor(editorId) {
                this.editor = document.getElementById(editorId);
                this.history = [];
                this.historyPos = -1;
                this.maxHistory = 50;
                
                this.init();
            }

            init() {
                // Save initial state
                this.saveState();
                
                // Add event listeners
                this.editor.addEventListener('input', () => {
                    this.updateWordCount();
                    this.saveState();
                });
                
                this.editor.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    this.insertText(text);
                });
                
                // Update initial word count
                this.updateWordCount();
            }

            getSelection() {
                return window.getSelection();
            }

            getRange() {
                const selection = this.getSelection();
                if (selection.rangeCount > 0) {
                    return selection.getRangeAt(0);
                }
                return null;
            }

            saveSelection() {
                const range = this.getRange();
                if (range) {
                    this.savedRange = range.cloneRange();
                }
            }

            restoreSelection() {
                if (this.savedRange) {
                    const selection = this.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(this.savedRange);
                }
            }

            wrapSelection(tagName, className = '') {
                const selection = this.getSelection();
                if (selection.rangeCount === 0) return;

                const range = selection.getRangeAt(0);
                const selectedText = range.extractContents();
                
                const wrapper = document.createElement(tagName);
                if (className) wrapper.className = className;
                wrapper.appendChild(selectedText);
                
                range.insertNode(wrapper);
                
                // Clear selection and set cursor after the inserted element
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.setStartAfter(wrapper);
                newRange.collapse(true);
                selection.addRange(newRange);
            }

            toggleFormat(format) {
                this.editor.focus();
                const selection = this.getSelection();
                
                if (selection.rangeCount === 0) return;
                
                const range = selection.getRangeAt(0);
                const selectedText = range.toString();
                
                if (!selectedText) return;
                
                // Check if the selection is already formatted
                const ancestor = range.commonAncestorContainer;
                const parentElement = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor;
                
                let tagName = format === 'bold' ? 'STRONG' : 
                            format === 'italic' ? 'EM' : 
                            format === 'underline' ? 'U' : null;
                
                // Check if already formatted
                let currentElement = parentElement;
                let isFormatted = false;
                
                while (currentElement && currentElement !== this.editor) {
                    if (currentElement.tagName === tagName) {
                        isFormatted = true;
                        break;
                    }
                    currentElement = currentElement.parentElement;
                }
                
                if (isFormatted) {
                    // Remove formatting
                    const content = currentElement.innerHTML;
                    currentElement.outerHTML = content;
                } else {
                    // Apply formatting
                    this.wrapSelection(tagName.toLowerCase());
                }
                
                this.updateToolbar();
            }

            setAlignment(align) {
                this.editor.focus();
                const selection = this.getSelection();
                
                if (selection.rangeCount === 0) return;
                
                const range = selection.getRangeAt(0);
                let paragraph = this.getParentParagraph(range.startContainer);
                
                if (!paragraph) {
                    // Create a new paragraph if needed
                    paragraph = document.createElement('p');
                    range.surroundContents(paragraph);
                }
                
                paragraph.style.textAlign = align;
            }

            getParentParagraph(node) {
                while (node && node !== this.editor) {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.tagName === 'P' || node.tagName === 'DIV')) {
                        return node;
                    }
                    node = node.parentElement;
                }
                return null;
            }

            toggleList(listType) {
                this.editor.focus();
                const selection = this.getSelection();
                
                if (selection.rangeCount === 0) return;
                
                const range = selection.getRangeAt(0);
                const startContainer = range.startContainer;
                
                // Find if we're already in a list
                let currentList = this.findParentElement(startContainer, 'UL,OL');
                
                if (currentList) {
                    // Convert list back to paragraphs
                    this.listToParagraphs(currentList);
                } else {
                    // Create new list
                    this.createList(listType, range);
                }
            }

            findParentElement(node, tagNames) {
                const tags = tagNames.split(',');
                while (node && node !== this.editor) {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        tags.includes(node.tagName)) {
                        return node;
                    }
                    node = node.parentElement;
                }
                return null;
            }

            createList(listType, range) {
                const list = document.createElement(listType);
                const listItem = document.createElement('li');
                
                const selectedContent = range.extractContents();
                listItem.appendChild(selectedContent);
                list.appendChild(listItem);
                
                range.insertNode(list);
                
                // Position cursor in the list item
                const newRange = document.createRange();
                newRange.setStart(listItem, 0);
                newRange.collapse(true);
                const selection = this.getSelection();
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            listToParagraphs(list) {
                const listItems = list.querySelectorAll('li');
                listItems.forEach(item => {
                    const p = document.createElement('p');
                    p.innerHTML = item.innerHTML;
                    list.parentNode.insertBefore(p, list);
                });
                list.remove();
            }

            insertText(text) {
                const selection = this.getSelection();
                if (selection.rangeCount === 0) return;
                
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));
                range.collapse(false);
            }

            updateWordCount() {
                const text = this.editor.innerText || '';
                const words = text.trim().split(/\s+/).filter(word => word.length > 0);
                document.getElementById('wordCount').textContent = words.length;
                document.getElementById('charCount').textContent = text.length;
            }

            saveState() {
                this.historyPos++;
                if (this.historyPos < this.history.length) {
                    this.history = this.history.slice(0, this.historyPos);
                }
                this.history.push(this.editor.innerHTML);
                if (this.history.length > this.maxHistory) {
                    this.history.shift();
                    this.historyPos--;
                }
            }

            undo() {
                if (this.historyPos > 0) {
                    this.historyPos--;
                    this.editor.innerHTML = this.history[this.historyPos];
                    this.updateWordCount();
                }
            }

            redo() {
                if (this.historyPos < this.history.length - 1) {
                    this.historyPos++;
                    this.editor.innerHTML = this.history[this.historyPos];
                    this.updateWordCount();
                }
            }

            clearContent() {
                this.editor.innerHTML = '<p></p>';
                this.saveState();
                this.updateWordCount();
            }

            getHTML() {
                return this.editor.innerHTML;
            }

            getPlainText() {
                return this.editor.innerText;
            }

            setContent(html) {
                this.editor.innerHTML = html;
                this.saveState();
                this.updateWordCount();
            }

            updateToolbar() {
                // This would update button states based on current selection
                // Implementation depends on specific toolbar design
            }
        }

        // Initialize the editor
        const editor = new RichTextEditor('editor');

        // Global functions for the toolbar
        function toggleFormat(format) {
            editor.toggleFormat(format);
        }

        function setAlignment(align) {
            editor.setAlignment(align);
        }

        function toggleList(listType) {
            editor.toggleList(listType);
        }

        function undo() {
            editor.undo();
        }

        function redo() {
            editor.redo();
        }

        function clearContent() {
            editor.clearContent();
        }

        function getHTML() {
            const content = editor.getHTML();
            document.getElementById('contentDisplay').textContent = content;
        }

        function getPlainText() {
            const content = editor.getPlainText();
            document.getElementById('contentDisplay').textContent = content;
        }

        function saveContent() {
            const content = editor.getHTML();
            localStorage.setItem('richTextContent', content);
            alert('Content saved to localStorage!');
        }

        function loadContent() {
            const content = localStorage.getItem('richTextContent');
            if (content) {
                editor.setContent(content);
                alert('Content loaded from localStorage!');
            } else {
                alert('No saved content found!');
            }
        }

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'b':
                        e.preventDefault();
                        toggleFormat('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        toggleFormat('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        toggleFormat('underline');
                        break;
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            redo();
                        } else {
                            undo();
                        }
                        break;
                }
            }
        });