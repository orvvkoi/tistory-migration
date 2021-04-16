$(function() {
  /**
   * fancytree event
   */

  $('#originTree').on('fancytreeinit', function(event, data) {
    const treeData = data.tree.toDict(false);
    const targetTree = $.ui.fancytree.getTree('#targetTree');

    if (targetTree) {
      targetTree.reload(treeData);
    }
  });

  const event = {
    click: (event, data) => {
      // data.node.setSelected(true) will work too
      let node = data.node;
      let targetType = data.targetType;
      //To fix a bug that doesn't appear at once when clicking on the lazy folder.

      if (node.isFolder() && targetType === 'checkbox') {
        node.toggleSelected();
      } else if (!node.isFolder() && targetType !== 'checkbox') {
        node.toggleSelected();
        return false;
      }

      if (node.isLazy() && !node.children && node.isExpanded()) {
        node.toggleExpanded();
      } else if (node.isFolder() && targetType === 'title') {
        node.toggleExpanded();
        return false;
      }
    },
    beforeSelect: (event, data) => {
      // A node is about to be selected: prevent this for folders:
      let node = data.node;

      if (node.isFolder() && !data.originalEvent) {
        return false;
      }
    },
    lazyLoad: (event, data) => {
      let node = data.node;
      let nodeData = node.data;

      if (nodeData.isEmpty === 'false') {
        data.result = $.Deferred((dfd) => {
          const req = UTIL.ajax.get('/api/migration/categories',
            { uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName } });

          req.done((res) => {
            if (res && res.length) {
              dfd.resolve(res);
            } else {
              const postReq = UTIL.ajax.get('/api/migration/posts',
                { uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName, categoryId: nodeData.categoryId } });

              postReq.done(dfd.resolve).fail(dfd.reject);
            }
          }).fail(err => {
            UTIL.modal.alert(err.responseText);
          });
        });
      } else {
        data.result = {
          url: '/api/migration/posts',
          data: {
            uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName, categoryId: nodeData.categoryId },
          },
          cache: false,
        };
      }
    },
    enhanceTitle: (event, data) => {
      let node = data.node;

      if (node.isFolder() && (node.data.isBlog || node.data.isCategory)) {
        data.$title.append(`<span style='color: #b3b2b2;'>  (post : ${node.data.isBlog ? node.data.statistics.post : node.data.entries})</span>`);
      }

    },
    loadChildren: (event, data) => {
      // update node and parent counters after lazy loading

      let node = data.node;
      let children = node.children;


      if (children
        && children.length === 1
        && children.find(node => node.statusNodeType === 'nodata')) {
        return;
      }

      node.updateCounters();

      let postCount = children.find(i => !(i.data.isCategory || i.data.isBlog));

      if (node.isFolder() && !node.checkbox && postCount) {
        node.checkbox = true;
        //    node.load()
      }

      children.map(function(item) {
        if (item.statusNodeType === 'paging') {
          item.title = `<span class='fa fa-plus-circle'>&nbsp;&nbsp;More...</span>`;
          item.url = `/api/migration/posts`;
        }
        return item;
      });

    },
    clickPaging: (event, data) => {
      let node = data.node;
      let nodeData = node.data;

      let params = {
        uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName, categoryId: nodeData.categoryId },
        page: nodeData.page,
      };

      node.replaceWith({
        url: node.url,
        data: params,
      }).done(function(res) {

      });
    },
  };

  const treeDnd5opts = (() => {

    const createMigrationProgressTable = (node, sourceNodes) => {
      const migrationTargetTitle = (() => {
        if (node.data.isBlog) {
          return node.data.name;
        } else {
          return node.data.label || node.data.name;
        }
      })();

      const totalPostCount = sourceNodes.reduce((acc, node) => {
        let sum = 0;

        if (node.data.isBlog) {
          sum = parseInt(node.data.statistics.post);
        } else if (node.data.isCategory) {
          sum = parseInt(node.data.entries);
        } else {
          sum += 1;
        }
        return acc + sum;
      }, 0);

      const row = (node) => {
        const parent = node.parent;
        const isCategory = node.data.isCategory;
        const isBlog = node.data.isBlog;

        const location = parent && parent.data && parent.data.label ? parent.data.label : node.title;

        const title = (() => {
          if (isBlog || isCategory) {
            return `<div class='fa fa-spinner fa-spin fa-2x fa-fw' style='color: #c3c6cf;'></div>`;
          } else {
            return node.title;
          }
        })();

        const _row = `
                <div class='row'>
                    <div class='cell' data-title='Location'>
                        ${location}
                    </div>
                    <div id='progressTitle${node.data.id}' class='cell' data-title='Title'>
                        ${title}
                    </div>
                    <div id='progressStatus${node.data.id}' class='cell' data-title='Status'>
                        <div class='fa fa-spinner fa-spin fa-2x fa-fw' style='color: #c3c6cf;'></div>
                    </div>
                    <div id='progressResult${node.data.id}' class='cell' data-title='Result'>
                        
                    </div>
                </div>`;

        return _row;
      };

      const rows = sourceNodes.map(node => row(node));

      const table = `
                <strong>Migration Target Blog/Category :</strong> ${migrationTargetTitle} <br/> 
                <strong>Total Post Count :</strong> <span id='successCount'>0</span> / ${totalPostCount} <hr>
                <div class='wrapper'>
                    <div id='tableBody' class='table'>
                        <div class='row header blue'>
                            <div class='cell' style='width : 20%'>
                                Location
                            </div>
                            <div class='cell' >
                                Title
                            </div>
                            <div class='cell' style='width : 6%'>
                                Status
                            </div>
                            <div class='cell' style='width : 25%'>
                                Migration Result
                            </div>
                        </div>
                        ${rows}
                    </div>
                </div> `;

      return table;
    };

    const migrationProgress = (node, sourceNodes) => {
      let progressRequest;

      const progressCancelDialog = () => {
        const _this = this;

        $.confirm({
          icon: 'fa fa-exclamation-triangle',
          title: 'Confirmation!',
          content: 'The work in progress will be cancelled.',
          boxWidth: '400px',
          useBootstrap: false,
          animation: 'scale',
          type: 'dark',
          buttons: {
            ok: {
              btnClass: 'btn-red',
              action: function() {
                progressRequest.abort();
                _this.close();
                progressDialog.close();
              },
            },
            cancel: {},
          },
        });

        return false;
      };

      const progressDialogOnOpen = (dialog) => {
        let _this = progressDialog;

        const uniqueKeys = sourceNodes.map(node => (
          {
            uuid: node.data.uuid,
            blogName: node.data.blogName,
            categoryId: node.data.categoryId,
            postId: node.data.postId,
          }
        ));

        const data = {
          uniqueKeys: uniqueKeys,
          targetUniqueKey: {
            uuid: node.data.uuid,
            blogName: node.data.blogName,
            categoryId: node.data.categoryId,
          },
        };

        progressRequest = UTIL.ajax.post('/api/migration/progress', data);

        progressRequest.done((res) => {
          _this.setType('green');
          _this.setIcon('fa fa-check');
          _this.setTitle('Work Complete');

          _this.buttons.done.enable();
          _this.buttons.done.show();
          _this.buttons.close.hide();
          _this.buttons.close.disable();

          $.ui.fancytree.getTree('#originTree').visit(function(node) {
            node.setSelected(false);
          });

        }).fail((err) => {
          UTIL.modal.alert(err.responseText);
        }).always(() => {
          socket.disconnect();
        });
      };

      const progressDialogContent = createMigrationProgressTable(node, sourceNodes);

      const progressDialog = $.confirm({
        title: 'Work in progress',
        icon: 'fa fa-spinner fa-spin',
        content: progressDialogContent,
        animation: 'scale',
        boxWidth: '60%',
        type: 'dark',
        useBootstrap: false,
        closeIcon: function() {
          return 'close'; // set a button handler, 'aRandomButton' prevents close.
        },
        closeIconClass: 'fa fa-close',
        buttons: {
          close: {
            action: progressCancelDialog,
          },
          done: {
            isHidden: true,
            isDisabled: true,
            btnClass: 'btn-blue',
          },
        },
        onOpen: progressDialogOnOpen,
      });
    };

    const _dragDrop = (node, data) => {
      let sourceNodes = data.otherNodeList;

      sourceNodes = sourceNodes.filter(n => !n.isFolder() && n.statusNodeType !== 'paging');

      sourceNodes = sourceNodes.reduce(function(pV, cV, cI) {
        let curr = cV.data.isCategory || cV.data.isBlog ? cV.getSelectedNodes() : [cV];
        return [...pV, ...curr];
      }, []);


      /*
      * 대상 카테고리의 게시물과 옮기려는 게시물의 제목을 비교 하여 중복 검사.
      * 로드된 게시물에 대해서만 검사함.
      */
      /*let childrens = (data.hitMode === "over") ? node.children : node.getParent().children;
      let titleList = childrens ? childrens.map(item => item.title) : [];
      let duplicateList = sourceNodes.filter(item=> titleList.includes(item.title)).map(item => item.title);*/

      /*
      * localStorage 저장된 이력으로 중복 검사.
      */
      const duplicates = sourceNodes.reduce((history, item) => {
        if (item.getParentList() && item.getParentList().length > 1) {
          let targetBlogNode = node.getLevel() > 1 ? node.data.isBlog ? node : node.getParentList()[1] : node;
          let targetCategoryId = node.data.id;
          let { name: targetBlogName, url: targetBlogUrl } = targetBlogNode.data;

          let originBlogNode = item.getParentList()[1];
          let originBlogKey = originBlogNode.data.name;

          let migrationHistory = UTIL.LocalStorage.get(originBlogKey) || {};

          let postIds = migrationHistory[targetBlogName]
            && migrationHistory[targetBlogName][targetCategoryId]
            && migrationHistory[targetBlogName][targetCategoryId][item.data.id];

          if (postIds) {
            let postHistory = postIds.map(postId => {
              return {
                node: item,
                title: item.title,
                url: `${targetBlogUrl}/${postId}`,
              };
            });

            history = [...history, ...postHistory];
          }
        }

        return history;
      }, []);

      if (duplicates.length) {
        const confirmContent = duplicates.map((item, index) => `${++index}, <a href='${item.url}' target='_blank'>${item.title}</a>`).join('<br/>');

        $.confirm({
          title: `The migration history exists.`,
          content: confirmContent,
          icon: 'fa fa-exclamation-triangle',
          type: 'red',
          boxWidth: '40%',
          useBootstrap: false,
          buttons: {
            process: {
              btnClass: 'btn-blue',
              keys: ['enter'],
              action: function() {
                migrationProgress(node, sourceNodes);
              },
            },
            duplicate: {
              text: 'Remove Duplicates and process',
              btnClass: 'btn-red',
              action: function() {
                const _this = this;
                const differenceNodes = sourceNodes.filter(node => !duplicates.find(item => item.node === node));

                if (differenceNodes.length) {
                  migrationProgress(node, differenceNodes);
                } else {
                  _this.setTitle('Remove Duplicates and process');
                  _this.setContent('There are no items that can be migrated.');
                  _this.buttons.duplicate.hide();
                  _this.buttons.duplicate.disable();
                  _this.buttons.process.hide();
                  _this.buttons.process.disable();
                  return false;
                }
              },
            },
            cancel: {},
          },
        });
        return;
      }

      migrationProgress(node, sourceNodes);
    };

    const _dragStart = (node, data) => {
      let level = node.getLevel();

      let selectedNodes = $.ui.fancytree.getTree(data.tree).getSelectedNodes();

      selectedNodes = selectedNodes.filter(n => !n.isFolder() && n.statusNodeType !== 'paging');
      let allowDrag = level > 1 && selectedNodes.length ? true : false;

      if (!allowDrag) {
        return false;
      }

      data.effectAllowed = 'all';
      return true;
    };

    const _dragEnter = (node, data) => {
      let sourceNodes = data.otherNodeList;
      let treeOrigin = sourceNodes.find(o => o.tree._ns === '.fancytree-2');

      if (node.tree._ns === data.otherNode.tree._ns || treeOrigin || node.getLevel() === 1) {
        return false;
      }

      return true;
    };

    const _dragOver = (node, data) => {
      // data.node.info("dragOver", data);

      data.hitMode = 'over';
      data.dropEffect = data.dropEffectSuggested;  //"link";
      return true;
    };

    const _dnd5opts = {
      preventVoidMoves: true, // Prevent moving nodes 'before self', etc.
      preventRecursion: true, // Prevent dropping nodes on own descendants
      preventSameParent: true, // Prevent dropping nodes under the same direct parent
      preventForeignNodes: false,
      preventNonNodes: true,
      preventLazyParents: true,
      dropEffectDefault: 'copy',
      autoExpandMS: 1000,
      multiSource: true,  // drag all selected nodes (plus current node)
      focusOnClick: true,
      refreshPositions: true,
      dragStart: _dragStart,
      dragEnter: _dragEnter,
      dragOver: _dragOver,
      dragDrop: _dragDrop,
    };

    return _dnd5opts;
  })();

  let _TREE_OPTION = {
    extensions: ['dnd5', 'multi', 'glyph', 'childcounter'],
    source: [],
    //  source: { url: '/api/migration/blogs', cache: false },
    checkbox: true,
    selectMode: 3,
    clickFolderMode: 3,
    autoScroll: true,
    keyboard: true,
    childcounter: {
      deep: true,
      hideZeros: true,
      hideExpanded: false,
    },
    click: event.click,
    beforeSelect: event.beforeSelect,
    lazyLoad: event.lazyLoad,
    enhanceTitle: event.enhanceTitle,
    loadChildren: event.loadChildren,
    clickPaging: event.clickPaging,
    glyph: {
      preset: 'awesome5',
      map: {},
    },
    dnd5: treeDnd5opts,
  };

  window.treeInitialize = () => {

    $('#originTree').fancytree(_TREE_OPTION);

    // ES9 object destructuring
    let { childcounter, loadChildren, ..._TREE_OPTION2 } = { ..._TREE_OPTION };
    _TREE_OPTION2.checkbox = false;
    _TREE_OPTION2.extensions = ['dnd5', 'multi', 'glyph'];
    _TREE_OPTION2.postProcess = function(event, data) {
      if (data.response) {
        let list = data.response.filter(item => item.folder).map(item => {
          item.lazy = !!item.children;

          if (item.children && item.children.length) {
            item.children = item.children.filter((child) => {
              child.lazy = !child.parent;
              return child;
            });
          }
          return item;
        });

        data.result = list;
      }
    };

    $('#targetTree').fancytree(_TREE_OPTION2);
  };

  treeInitialize();

});


$(function() {
  /**
   * fancytree updateCounters
   * 의도치 않은 결과로 인해 오버라이드
   * 다중 트리인 경우, 모든 트리에 count가 적용 됨
   * node.span 이 없는 경우 undefined 반환
   */
  $.ui.fancytree._FancytreeNodeClass.prototype.updateCounters = function() {
    var node = this;

    if (!node.span) {
      return;
    }

    var $badge = $('span.fancytree-childcounter', node.span),
      extOpts = node.tree.options.childcounter,
      count = node.countChildren(extOpts.deep);

    node.data.childCounter = count;
    if (
      (count || !extOpts.hideZeros) &&
      (!node.isExpanded() || !extOpts.hideExpanded)
    ) {
      if (!$badge.length) {
        $badge = $('<span class=\'fancytree-childcounter\'/>').appendTo(
          $(
            'span.fancytree-icon,span.fancytree-custom-icon',
            node.span,
          ),
        );
      }
      $badge.text(count);
    } else {
      $badge.remove();
    }
    if (extOpts.deep && !node.isTopLevel() && !node.isRootNode()) {
      node.parent.updateCounters();
    }
  };

  /**
   * fancytree countChildren 오버라이드
   * node type이 paging인 경우 카운트에서 제외함.
   */
  $.ui.fancytree._FancytreeNodeClass.prototype.countChildren = function(deep) {
    var cl = this.children,
      i,
      l,
      n,
      c;

    if (!cl || cl[0].statusNodeType === 'nodata') {
      return 0;
    }

    c = cl.length;
    n = cl.length;

    let hasPaging = cl.find(n => n.statusNodeType === 'paging');
    if (hasPaging) {
      n -= 1;
    }

    if (deep !== false) {
      for (i = 0, l = c; i < l; i++) {
        n += cl[i].countChildren();
      }
    }
    return n;
  };
});