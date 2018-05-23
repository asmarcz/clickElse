/**
 * https://github.com/asmarcz/clickElse
 * @copyright Copyright (c) 2018 Oliver Tušla
 * @version 1.0.0
 */
class clickElse {
	constructor(observeMutation) {
		this.observeMutation = typeof observeMutation !== 'undefined' ? !!observeMutation : false;
		this.id = 1;
		this.wrappers = []; // [Element, ...]
		this.tracked = []; // [ [Element, 'wanted pointerEvents', wrapperId], ... ]
		this.temporarilyDisabled = []; // [wrapperId, ...]
		this.excluded = []; // [ [Element, wrapperId], ... ]

		this.after = []; // [function(wrapperElement, hasOwnPointerEvents)]

		this._setUpWrapper = wrapper => {
			if (!wrapper.hasAttribute('click-else-id')) {
				wrapper.setAttribute('click-else', '');
				wrapper.setAttribute('click-else-id', this.id++);
				for (let i = 0; i < wrapper.children.length; i++) {
					this.tracked.push([wrapper.children[i], wrapper.children[i].style.pointerEvents || 'auto', wrapper.getAttribute('click-else-id')]);
					wrapper.children[i].style.pointerEvents = 'none';
				}
				if (this.observeMutation) {
					this.observer.observe(wrapper, {
						childList: true
					});
				}
				this.wrappers.push(wrapper);
				return true;
			}
			if (typeof console.log === 'function') console.log(['Wrapper cannot be set up!', wrapper]);
			return false;
		};

		this._exclude = element => {
			if (element.parentNode.hasAttribute('click-else-id')) {
				let wrapperId = element.parentNode.getAttribute('click-else-id');
				this.excluded.push([element, wrapperId]);
				if (!this.temporarilyDisabled.includes(wrapperId)) {
					element.style.pointerEvents = this.tracked.find((el) => {
						return el[0] === element;
					})[1];
				}
				return true;
			}
			if (typeof console.log === 'function') console.log(['Element cannot be excluded!', element]);
			return false;
		};

		this._include = element => {
			let index = this.excluded.findIndex((el) => {
				return element === el[0];
			});
			if (index !== -1) {
				if (!this.temporarilyDisabled.includes(this.excluded[index][1])) {
					let trackedIndex = this.tracked.findIndex((el) => {
						return el[0] === element;
					});
					this.tracked[trackedIndex][1] = element.style.pointerEvents;
					element.style.pointerEvents = 'none';
				}
				this.excluded.splice(index, 1);
				return true;
			}
			if (typeof console.log === 'function') console.log(['Element cannot be included!', element]);
			return false;
		};

		this._clearWrapper = wrapper => {
			if (wrapper.hasAttribute('click-else-id')) {
				let wrapperId = wrapper.getAttribute('click-else-id');
				for (let i = 0; i < wrapper.children.length; i++) {
					let index = this.tracked.findIndex((el) => {
						return el[2] === wrapperId;
					});
					this.tracked[index][0].style.pointerEvents = this.tracked[index][1];
					this.tracked.splice(index, 1);
				}
				wrapper.removeAttribute('click-else-id');
				wrapper.removeAttribute('click-else');
				this.wrappers.splice(this.wrappers.findIndex((el) => {
					return el === wrapper;
				}), 1);
				return true;
			}
			if (typeof console.log === 'function') console.log(['Wrapper cannot be removed!', wrapper]);
			return false;
		};

		if (this.observeMutation) {
			this.observer = new MutationObserver((mutationList) => {
				for (let mutation of mutationList) {
					for (let node of mutation.addedNodes) {
						if (Element.prototype.isPrototypeOf(node)) {
							this.tracked.push([node, node.style.pointerEvents || 'auto', node.parentElement.getAttribute('click-else-id')]);
							if (!this.temporarilyDisabled.includes(
								node.parentElement.getAttribute('click-else-id')
							)) {
								node.style.pointerEvents = 'none';
							}
						}
					}
				}
			});
		}

		let clickElseElements = document.querySelectorAll('[click-else]');
		for (let i = 0; i < clickElseElements.length; i++) {
			clickElseElements[i].setAttribute('click-else-id', this.id++);
			let children = clickElseElements[i].children;
			for (let j = 0; j < children.length; j++) {
				this.tracked.push([children[j], children[j].style.pointerEvents || 'auto', clickElseElements[i].getAttribute('click-else-id')]);
				children[j].style.pointerEvents = 'none';
			}
			if (this.observeMutation) {
				this.observer.observe(clickElseElements[i], {
					childList: true
				});
			}
			this.wrappers.push(clickElseElements[i]);
		}

		document.addEventListener('click', (ev) => {
			let el = ev.target;
			if (!el.hasAttribute('click-else')) {
				while (el.parentNode && !el.hasAttribute('click-else')) {
					if (-1 !== this.excluded.findIndex((data) => {
						return data[0] === el;
					})) {
						return;
					}
					el = el.parentNode;
				}
			}

			if (typeof el.hasAttribute === 'function' && el.hasAttribute('click-else')) {
				let parentWrappersArr = [];
				let parentWrapper = el;
				while (parentWrapper = this.getParentWrapper(parentWrapper)) {
					parentWrappersArr.push(parentWrapper);
				}

				let i = this.temporarilyDisabled.length;
				while (i--) {
					if (!parentWrappersArr.includes(
						document.querySelector(
							'[click-else-id="' + this.temporarilyDisabled[i] + '"]'
						)
					)) {
						this._enableIndex(i);
					}
				}

				if (!this.temporarilyDisabled.includes(
					el.getAttribute('click-else-id')
				)) {
					this._disableWrapper(el);
				}
			} else {
				let i = this.temporarilyDisabled.length;
				while (i--) {
					this._enableIndex(i);
				}
			}
		});
	}

	_afterCall(wrapper, hasOwnPointerEvents) {
		for (let f of this.after) {
			f(wrapper, hasOwnPointerEvents);
		}
	}

	_disableWrapper(el) {
		for (let i = 0; i < el.children.length; i++) {
			el.children[i].style.pointerEvents = this.tracked.find((innerArr) => {
				return innerArr[0] === el.children[i];
			})[1];
		}
		this.temporarilyDisabled.push(
			el.getAttribute('click-else-id')
		);
		this._afterCall(el, true);
	}

	_enableIndex(i) {
		let wrapper = document.querySelector(
			'[click-else-id="' + this.temporarilyDisabled[i] + '"]'
		);
		for (let j = 0; j < wrapper.children.length; j++) {
			let index = this.tracked.findIndex((innerArr) => {
				return innerArr[0] === wrapper.children[j];
			});
			this.tracked[index][0] = wrapper.children[j];
			this.tracked[index][1] = wrapper.children[j].style.pointerEvents;
			this.tracked[index][2] = wrapper.getAttribute('click-else-id');
			if (!this.excluded.find((el) => {
				return el[0] === this.tracked[index][0];
			})) {
				wrapper.children[j].style.pointerEvents = 'none';
			}
		}
		this.temporarilyDisabled.splice(i, 1);
		this._afterCall(wrapper, false);
	}

	getWrapper(el) {
		if (!el.hasAttribute('click-else')) {
			while (el.parentNode && !el.hasAttribute('click-else')) {
				el = el.parentNode;
			}
		}
		return typeof el.hasAttribute === 'function' && el.hasAttribute('click-else') ? el : false;
	}

	getParentWrapper(el) {
		let wrapper = this.getWrapper(el);
		let parentWrapper = false;
		if (wrapper && wrapper.parentNode) {
			parentWrapper = this.getWrapper(wrapper.parentNode);
		}
		return parentWrapper;
	}

	_apply(els, f) {
		if (Element.prototype.isPrototypeOf(els)) {
			return f(els);
		} else if (HTMLCollection.prototype.isPrototypeOf(els) || NodeList.prototype.isPrototypeOf(els)) {
			for (let el of els) {
				f(el);
			}
		} else if (typeof els === 'string') {
			for (let el of document.querySelectorAll(els)) {
				f(el);
			}
		} else {
			return false;
		}
		return true;
	}

	add(elements) {
		return this._apply(elements, this._setUpWrapper);
	}

	remove(wrappers, isId) {
		if ((typeof wrappers === 'string' || typeof wrappers === 'number') && isId) {
			wrappers = wrappers.toString();
			let index = this.wrappers.findIndex((el) => {
				return el.getAttribute('click-else-id') === wrappers;
			});
			if (index === -1) return false;
			return this._clearWrapper(this.wrappers[index]);
		} else if (!isId) {
			return this._apply(wrappers, this._clearWrapper);
		}
		return false;
	}

	// intended to use only on direct descendants of wrapper
	exclude(elements) {
		return this._apply(elements, this._exclude);
	}

	// works only for excluded elements
	include(elements) {
		return this._apply(elements, this._include);
	}
}