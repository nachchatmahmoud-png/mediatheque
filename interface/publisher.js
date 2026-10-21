// Source de l’interface publique ; assemblée par scripts/build-interface.mjs.
function nf({ onBack: e, onToast: a, items = [], onPreview }) {
  let [t, l] = (0, pe.useState)([]),
    [o, i] = (0, pe.useState)(""),
    [u, n] = (0, pe.useState)(SL),
    [r, f] = (0, pe.useState)(el[0]),
    [x, h] = (0, pe.useState)(""),
    [s, p] = (0, pe.useState)(""),
    [S, C] = (0, pe.useState)(""),
    [T, m] = (0, pe.useState)(""),
    [c, g] = (0, pe.useState)("fr"),
    [L, z] = (0, pe.useState)([]),
    [R, I] = (0, pe.useState)([]),
    [M, H] = (0, pe.useState)(null),
    [k, _e] = (0, pe.useState)(""),
    [te, tl] = (0, pe.useState)(""),
    [ke, ql] = (0, pe.useState)(null),
    [ye, El] = (0, pe.useState)(""),
    [Ae, Ol] = (0, pe.useState)(!1),
    [Ja, yt] = (0, pe.useState)(""),
    [Oa, ll] = (0, pe.useState)(""),
    Ze = t.includes("photo"),
    He = t.includes("video"),
    Wa = t.includes("press");
  const [previewOpen, setPreviewOpen] = pe.useState(false);
  const [downloadUrl, setDownloadUrl] = pe.useState('');
  pe.useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);
  const [savedDraft, setSavedDraft] = pe.useState(() => {
    try { const value = JSON.parse(sessionStorage.getItem('mediatheque-draft') || 'null'); return value?.schema === 1 ? value : null; } catch { return null; }
  });
  const exportId = pe.useRef('');
  const selectedFiles = [...(Ze ? L : []), ...(He && M ? [M] : []), ...(Wa && ke ? [ke] : [])];
  const totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
  const saveDraft = () => {
    const value = { schema: 1, types: t, title: o, date: u, topic: r, location: x, description: s, keywords: S, credit: T, language: c, videoUrl: k, transcript: te, pressText: ye, exportId: exportId.current,
      photoNotes: L.map((file, index) => ({name: file.name, size: file.size, caption: R[index] || ''})) };
    try { sessionStorage.setItem('mediatheque-draft', JSON.stringify(value)); setSavedDraft(value); a('Le brouillon de saisie est enregistré pour cet onglet. Les fichiers ne sont pas conservés.'); }
    catch { a('Le navigateur ne permet pas l’enregistrement du brouillon.'); }
  };
  const restoreDraft = () => {
    if (!savedDraft) return;
    const value = savedDraft;
    l(Array.isArray(value.types) ? value.types.filter(type => ['photo', 'video', 'press'].includes(type)) : []);
    i(String(value.title || '').slice(0, 180)); n(/^\d{4}-\d{2}-\d{2}$/.test(value.date) ? value.date : SL());
    f(el.includes(value.topic) ? value.topic : el[0]); h(String(value.location || '').slice(0, 150));
    p(String(value.description || '').slice(0, 2000)); C(String(value.keywords || '').slice(0, 3000));
    m(String(value.credit || '').slice(0, 200)); g(value.language === 'ar' ? 'ar' : 'fr');
    _e(String(value.videoUrl || '').slice(0, 2000)); tl(String(value.transcript || '').slice(0, 60000)); El(String(value.pressText || '').slice(0, 40000));
    z([]); I([]); H(null); ql(null); exportId.current = /^[a-z0-9][a-z0-9-]{2,79}$/.test(value.exportId) ? value.exportId : '';
    a('Le brouillon a été repris. Sélectionnez à nouveau les fichiers à joindre.');
  };
  const movePhoto = (index, destination) => {
    const files = [...L], captions = [...R];
    files.splice(destination, 0, files.splice(index, 1)[0]); captions.splice(destination, 0, captions.splice(index, 1)[0]);
    z(files); I(captions);
  };
  (0, pe.useEffect)(
    () => ll(""),
    [t, o, u, r, x, s, S, T, c, L, R, M, k, te, ke, ye],
  );
  let Ha = (B) => {
      (l((P) => (P.includes(B) ? P.filter((Ne) => Ne !== B) : [...P, B])),
        yt(""));
    },
    cu = (B) => {
      if (!B) return;
      let P = Array.from(B).filter(file => !L.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));
      try { P.forEach(file => mxValidateFile(file, 'photo')); } catch (error) { yt(error.message); return; }
      if (!P.length) { a('Ces photographies sont déjà sélectionnées.'); return; }
      if (L.length + P.length > 30) {
        yt("Un album peut contenir jusqu’à 30 photographies.");
        return;
      }
      const notes = Array.isArray(savedDraft?.photoNotes) ? savedDraft.photoNotes : [];
      const noteFor = file => notes.find(note => note.name === file.name && note.size === file.size);
      if (!L.length && notes.length) P.sort((left, right) => (notes.indexOf(noteFor(left)) < 0 ? 999 : notes.indexOf(noteFor(left))) - (notes.indexOf(noteFor(right)) < 0 ? 999 : notes.indexOf(noteFor(right))));
      (z([...L, ...P]), I([...R, ...P.map(file => String(noteFor(file)?.caption || '').slice(0, 300))]), yt(""));
    },
    Fo = async (B) => {
      (B.preventDefault(), yt(""), ll(""), Ol(!0));
      try {
        if (!t.length) throw new Error("Choisissez un contenu à ajouter.");
        if (Ze && !L.length)
          throw new Error(
            "Ajoutez au moins une photographie à l’album.",
          );
        if (He && !M && !k.trim())
          throw new Error(
            "Sélectionnez la vidéo ou renseignez son adresse HTTPS.",
          );
        if (Wa && !ke && !ye.trim())
          throw new Error(
            "Sélectionnez le PDF ou saisissez le texte du communiqué dans les informations complémentaires.",
          );
        let P =
            exportId.current || (u + "-" + zg(o)).slice(0, 66) +
            "-" +
            mxPublicationSuffix(),
          Ne = [];
        if (
          [
            ...(Ze ? L : []),
            ...(He && M ? [M] : []),
            ...(Wa && ke ? [ke] : []),
          ].reduce((Ce, ha) => Ce + ha.size, 0) >
          100 * uf
        )
          throw new Error(
            "Limitez un dossier à 100 Mio pour préparer sa publication.",
          );
        let Na = async (Ce, ha, lr) => {
            let or = Ce.name.split(".").at(-1)?.toLowerCase() || "",
              Fe =
                ha +
                "/" +
                String(lr + 1).padStart(2, "0") +
                "-" +
                zg(Ce.name.replace(/\.[^.]+$/, "")) +
                "." +
                or,
              Po = new Uint8Array(await Ce.arrayBuffer());
            return (
              Ig(Po, Fe),
              Ne.push({ name: P + "/" + Fe, data: Po }),
              Fe
            );
          },
          St = [];
        if (Ze)
          for (let Ce = 0; Ce < L.length; Ce++)
            St.push({
              file: await Na(L[Ce], "photos", Ce),
              caption: R[Ce] || "",
            });
        let Da = He
            ? M
              ? [{ file: await Na(M, "videos", 0), title: o, transcript: te }]
              : [{ url: k.trim(), title: o, transcript: te }]
            : [],
          tr = Wa
            ? [
                {
                  ...(ke ? { file: await Na(ke, "communiques", 0) } : {}),
                  title: o,
                  text: ye,
                },
              ]
            : [],
          pu = {
            version: 1,
            status: "published",
            title: o,
            date: u,
            topic: r,
            location: x,
            description: s,
            language: c,
            credit: T,
            keywords: Ro(S),
            photos: St,
            videos: Da,
            press: tr,
          };
        (wg(pu, P),
          Ne.unshift({
            name: P + "/publication.json",
            data: new TextEncoder().encode(
              JSON.stringify(pu, null, 2) +
                `
`,
            ),
          }));
        let mu = Cg(Ne),
          Se = URL.createObjectURL(
            new Blob([mu], { type: "application/zip" }),
          ),
          ga = document.createElement("a");
        ((ga.href = Se),
          (ga.download = P + ".zip"),
        (ga.style.display = 'none'),
        document.body.append(ga),
          ga.click(),
        ga.remove(),
        setDownloadUrl(Se),
          exportId.current = P,
          ll(P),
          a(
            "Le dossier est prêt. Poursuivez la mise en ligne pour publier votre contenu.",
          ));
      } catch (P) {
        yt(
          P instanceof Error
            ? P.message
            : "La préparation du dossier a échoué.",
        );
      } finally {
        Ol(!1);
      }
    },
    ol = Ze
      ? "Titre de l’événement / de l’album"
      : t.length > 1
        ? "Titre de l’événement"
        : "Titre de la publication";
  return (0, y.jsxs)("section", {
    className: "container gh-management",
    children: [
      (0, y.jsxs)("button", {
        className: "button secondary",
        onClick: e,
        children: [
          (0, y.jsx)(Xi, { size: 17 }),
          "Retour à la médiathèque",
        ],
      }),
      (0, y.jsxs)("div", {
        className: "gh-heading",
        children: [
          (0, y.jsxs)("div", {
            className: "eyebrow",
            children: [
              (0, y.jsx)(Qa, { size: 17 }),
              "SERVICE DE COMMUNICATION",
            ],
          }),
          (0, y.jsx)("h1", { children: "Gestion des contenus" }),
          (0, y.jsx)("p", {
            children:
              "Préparez une publication et réunissez les photos, vidéos et communiqués d’un même événement dans une seule fiche.",
          }),
        ],
      }),
      mxElement('ol', {className: 'mx-publish-steps', 'aria-label': 'Étapes de publication'},
        ...['Choisir les supports', 'Renseigner la fiche', 'Vérifier et publier'].map((label, index) => mxElement('li', {key: label}, mxElement('span', null, index + 1), label))),
      savedDraft && mxElement('div', {className: 'mx-draft-banner'}, mxElement('span', null, 'Un brouillon de saisie est disponible dans cet onglet.'), mxElement('button', {className: 'button secondary', type: 'button', onClick: restoreDraft}, 'Reprendre le brouillon')),
      (0, y.jsx)("div", {
        className: "transfer-shortcuts gh-type-choices",
        role: "group",
        "aria-label": "Choisir le contenu à ajouter",
        children: yL.map(
          ({ type: B, Icon: P, label: Ne, action: Qe, hint: Na }) =>
            (0, y.jsxs)(
              "button",
              {
                type: "button",
                disabled: Ae,
                className:
                  "transfer-shortcut gh-type-card " +
                  B +
                  (t.includes(B) ? " selected" : ""),
                onClick: () => Ha(B),
                "aria-pressed": t.includes(B),
                children: [
                  (0, y.jsx)("span", {
                    className: "transfer-shortcut-icon",
                    children: (0, y.jsx)(P, { size: 29 }),
                  }),
                  (0, y.jsxs)("span", {
                    children: [
                      (0, y.jsx)("small", {
                        className: "gh-space-label",
                        children: Ne,
                      }),
                      (0, y.jsx)("strong", { children: Qe }),
                      (0, y.jsx)("small", { children: Na }),
                    ],
                  }),
                  t.includes(B)
                    ? (0, y.jsx)(zl, { size: 21 })
                    : (0, y.jsx)(Jt, { size: 21 }),
                ],
              },
              B,
            ),
        ),
      }),
      !!t.length &&
        (0, y.jsx)(y.Fragment, {
          children: (0, y.jsxs)("form", {
            className: "gh-form",
            onSubmit: Fo,
            children: [
              He &&
                (0, y.jsxs)("fieldset", {
                  disabled: Ae,
                  children: [
                    (0, y.jsxs)("legend", {
                      children: [
                        (0, y.jsx)(Ta, { size: 19 }),
                        "Importer une vidéo",
                      ],
                    }),
                    (0, y.jsx)("p", {
                      children: "MP4 ou WebM · 25 Mio maximum.",
                    }),
                    (0, y.jsxs)("label", {
                      className: "gh-file-label",
                      htmlFor: "gh-video",
                      children: [
                        "Sélectionner une vidéo",
                        (0, y.jsx)("input", {
                          id: "gh-video",
                          type: "file",
                          accept: "video/mp4,video/webm",
                          onChange: (B) => {
                            const file = B.target.files?.[0];
                            try { if (file) mxValidateFile(file, 'video'); H(file || null); _e(''); yt(''); } catch (error) { yt(error.message); }
                            B.target.value = '';
                          },
                        }),
                      ],
                    }),
                    M &&
                      (0, y.jsxs)("p", {
                        children: [
                          M.name,
                          " ",
                          (0, y.jsx)("button", {
                            type: "button",
                            className: "gh-text-button",
                            onClick: () => H(null),
                            children: "Retirer",
                          }),
                        ],
                      }),
                    (0, y.jsxs)("details", {
                      className: "gh-file-alternative",
                      children: [
                        (0, y.jsx)("summary", {
                          children: "Utiliser un lien vidéo",
                        }),
                        (0, y.jsxs)("div", {
                          className: "field",
                          children: [
                            (0, y.jsx)("label", {
                              htmlFor: "gh-video-url",
                              children: "Adresse HTTPS de la vidéo",
                            }),
                            (0, y.jsx)("input", {
                              id: "gh-video-url",
                              type: "url",
                              value: k,
                              disabled: !!M,
                              onChange: (B) => _e(B.target.value),
                              maxLength: 2e3,
                              placeholder: "https://…",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              Ze &&
                (0, y.jsxs)("fieldset", {
                  disabled: Ae,
                  children: [
                    (0, y.jsxs)("legend", {
                      children: [
                        (0, y.jsx)(pa, { size: 19 }),
                        "Importer des photos",
                      ],
                    }),
                    (0, y.jsx)("p", {
                      children:
                        "JPG, PNG ou WebP · 30 photos par album · 12 Mio maximum par photo.",
                    }),
                    (0, y.jsxs)("label", {
                      className: "gh-file-label",
                      htmlFor: "gh-photos",
                      children: [
                        "Sélectionner plusieurs photos",
                        (0, y.jsx)("input", {
                          id: "gh-photos",
                          type: "file",
                          accept: "image/jpeg,image/png,image/webp",
                          multiple: !0,
                          onChange: (B) => {
                            (cu(B.target.files), (B.target.value = ""));
                          },
                        }),
                      ],
                    }),
                    mxElement('div', {className: 'mx-photo-grid'}, L.map((file, index) => mxElement(MxPhotoPreview, {
                      key: file.name + '-' + file.lastModified + '-' + file.size,
                      file, caption: R[index] || '', index, total: L.length,
                      onCaption: value => I(R.map((caption, position) => position === index ? value : caption)),
                      onRemove: () => {z(L.filter((_, position) => position !== index)); I(R.filter((_, position) => position !== index));},
                      onMove: destination => movePhoto(index, destination),
                    }))),
                  ],
                }),
              Wa &&
                (0, y.jsxs)("fieldset", {
                  disabled: Ae,
                  children: [
                    (0, y.jsxs)("legend", {
                      children: [
                        (0, y.jsx)(ma, { size: 19 }),
                        "Importer un communiqué",
                      ],
                    }),
                    (0, y.jsx)("p", {
                      children: "Document PDF · 20 Mio maximum.",
                    }),
                    (0, y.jsxs)("label", {
                      className: "gh-file-label",
                      htmlFor: "gh-pdf",
                      children: [
                        "Sélectionner le PDF",
                        (0, y.jsx)("input", {
                          id: "gh-pdf",
                          type: "file",
                          accept: "application/pdf",
                          onChange: (B) => { const file = B.target.files?.[0]; try { if (file) mxValidateFile(file, 'press'); ql(file || null); yt(''); } catch (error) { yt(error.message); } B.target.value = ''; },
                        }),
                      ],
                    }),
                    ke &&
                      (0, y.jsxs)("p", {
                        children: [
                          ke.name,
                          " ",
                          (0, y.jsx)("button", {
                            type: "button",
                            className: "gh-text-button",
                            onClick: () => ql(null),
                            children: "Retirer",
                          }),
                        ],
                      }),
                  ],
                }),
              (0, y.jsxs)("fieldset", {
                disabled: Ae,
                children: [
                  (0, y.jsx)("legend", {
                    children: "Informations essentielles",
                  }),
                  (0, y.jsxs)("div", {
                    className: "gh-fields",
                    children: [
                      (0, y.jsxs)("div", {
                        className: "field",
                        children: [
                          (0, y.jsxs)("label", {
                            htmlFor: "gh-title",
                            children: [ol, " *"],
                          }),
                          (0, y.jsx)("input", {
                            id: "gh-title",
                            value: o,
                            onChange: (B) => i(B.target.value),
                            maxLength: 180,
                            required: !0,
                          }),
                        ],
                      }),
                      (0, y.jsxs)("div", {
                        className: "field",
                        children: [
                          (0, y.jsxs)("label", {
                            htmlFor: "gh-date",
                            children: [
                              Ze || t.length > 1
                                ? "Date de l’événement"
                                : "Date de la publication",
                              " *",
                            ],
                          }),
                          (0, y.jsx)("input", {
                            id: "gh-date",
                            type: "date",
                            value: u,
                            onChange: (B) => n(B.target.value),
                            required: !0,
                          }),
                        ],
                      }),
                      (0, y.jsxs)("div", {
                        className: "gh-wide",
                        children: [
                          (0, y.jsx)(tf, {
                            value: S,
                            onChange: C,
                            topic: r,
                            text: [
                              o,
                              s,
                              x,
                              He ? te : "",
                              Wa ? ye : "",
                              ...(Ze ? R : []),
                            ].join(" "),
                            required: !0,
                          }),
                          (0, y.jsx)(lf, {
                            value: r,
                            onChange: f,
                            keywords: S,
                            autoSelect: !0,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              (0, y.jsx)("fieldset", {
                disabled: Ae,
                className: "gh-optional",
                "aria-label": "Informations complémentaires",
                children: (0, y.jsxs)("details", {
                  children: [
                    (0, y.jsxs)("summary", {
                      children: [
                        (0, y.jsx)("span", {
                          children: "Informations complémentaires",
                        }),
                        (0, y.jsx)("small", { children: "Facultatif" }),
                        (0, y.jsx)(Zi, { size: 19 }),
                      ],
                    }),
                    (0, y.jsxs)("div", {
                      className: "gh-fields",
                      children: [
                        (0, y.jsxs)("div", {
                          className: "field gh-wide",
                          children: [
                            (0, y.jsx)("label", {
                              htmlFor: "gh-description",
                              children: "Courte description",
                            }),
                            (0, y.jsx)("textarea", {
                              id: "gh-description",
                              value: s,
                              onChange: (B) => p(B.target.value),
                              maxLength: 2e3,
                              rows: 3,
                            }),
                          ],
                        }),
                        (0, y.jsxs)("div", {
                          className: "field",
                          children: [
                            (0, y.jsx)("label", {
                              htmlFor: "gh-location",
                              children: "Lieu",
                            }),
                            (0, y.jsx)("input", {
                              id: "gh-location",
                              value: x,
                              onChange: (B) => h(B.target.value),
                              maxLength: 150,
                            }),
                          ],
                        }),
                        (0, y.jsxs)("div", {
                          className: "field",
                          children: [
                            (0, y.jsx)("label", {
                              htmlFor: "gh-language",
                              children: "Langue du contenu",
                            }),
                            (0, y.jsxs)("select", {
                              id: "gh-language",
                              value: c,
                              onChange: (B) => g(B.target.value),
                              children: [
                                (0, y.jsx)("option", {
                                  value: "fr",
                                  children: "Français",
                                }),
                                (0, y.jsx)("option", {
                                  value: "ar",
                                  children:
                                    "العربية",
                                }),
                              ],
                            }),
                          ],
                        }),
                        (0, y.jsxs)("div", {
                          className: "field gh-wide",
                          children: [
                            (0, y.jsx)("label", {
                              htmlFor: "gh-credit",
                              children: "Crédits / auteur",
                            }),
                            (0, y.jsx)("input", {
                              id: "gh-credit",
                              value: T,
                              onChange: (B) => m(B.target.value),
                              maxLength: 200,
                            }),
                          ],
                        }),
                        He &&
                          (0, y.jsxs)("div", {
                            className: "field gh-wide",
                            children: [
                              (0, y.jsx)("label", {
                                htmlFor: "gh-transcript",
                                children: "Transcription de la vidéo",
                              }),
                              (0, y.jsx)("textarea", {
                                id: "gh-transcript",
                                value: te,
                                onChange: (B) => tl(B.target.value),
                                maxLength: 6e4,
                                rows: 4,
                              }),
                            ],
                          }),
                        Wa &&
                          (0, y.jsxs)("div", {
                            className: "field gh-wide",
                            children: [
                              (0, y.jsx)("label", {
                                htmlFor: "gh-press",
                                children: "Texte du communiqué",
                              }),
                              (0, y.jsx)("textarea", {
                                id: "gh-press",
                                value: ye,
                                onChange: (B) => El(B.target.value),
                                maxLength: 4e4,
                                rows: 5,
                              }),
                              (0, y.jsx)("small", {
                                children:
                                  "À renseigner si vous ne joignez pas de PDF, ou pour permettre la recherche dans le texte.",
                              }),
                            ],
                          }),

                      ],
                    }),
                  ],
                }),
              }),
              Ja &&
                (0, y.jsx)("p", {
                  className: "gh-error",
                  role: "alert",
                  children: Ja,
                }),
              mxElement('section', {className: 'mx-publication-summary', 'aria-label': 'Récapitulatif de la publication'},
                mxElement('div', null, mxElement('h2', null, 'Vérifier la publication'), mxElement('p', null, o || 'Renseignez le titre de votre publication.')),
                mxElement('dl', null,
                  mxElement('div', null, mxElement('dt', null, 'Supports'), mxElement('dd', null, t.map(type => nu[type]).join(' · '))),
                  mxElement('div', null, mxElement('dt', null, 'Fichiers'), mxElement('dd', null, mxPlural(selectedFiles.length, 'fichier') + ' · ' + mxSize(totalBytes))),
                  mxElement('div', null, mxElement('dt', null, 'Rubrique'), mxElement('dd', null, r))),
                mxElement('div', {className: 'mx-summary-actions'},
                  mxElement('button', {className: 'button secondary', type: 'button', disabled: Ae, onClick: () => setPreviewOpen(true)}, mxElement(au, {size: 17}), 'Aperçu de la publication'),
                  mxElement('button', {className: 'button secondary', type: 'button', disabled: Ae, onClick: saveDraft}, 'Enregistrer le brouillon')),
                mxElement('small', null, 'Le brouillon conserve la saisie dans cet onglet. Les fichiers doivent être sélectionnés à nouveau après rechargement.')),
              (0, y.jsxs)("div", {
                className: "gh-export",
                children: [
                  (0, y.jsxs)("button", {
                    className: "button primary",
                    type: "submit",
                    disabled: Ae,
                    children: [
                      (0, y.jsx)(Wt, { size: 18 }),
                      Ae
                        ? "Préparation du dossier…"
                        : "Télécharger le dossier de publication",
                    ],
                  }),
                  (0, y.jsx)("p", {
                    children:
                      "Un dossier ZIP est téléchargé sur votre ordinateur. La mise en ligne se poursuit à l’étape suivante.",
                  }),
                ],
              }),
            ],
          }),
        }),
      previewOpen && mxElement(MxPublicationPreview, {title: o, date: u, topic: r, description: s, language: c, photos: Ze ? L : [], captions: R, video: He ? M : null, videoUrl: He ? k : '', press: Wa ? ke : null, pressText: Wa ? ye : '', onClose: () => setPreviewOpen(false)}),
      mxElement(MxPublishedList, {items, onOpen: onPreview}),
      Oa &&
        (0, y.jsxs)("div", {
          className: "gh-success",
          role: "status",
          children: [
            (0, y.jsx)("h2", { children: "Votre dossier est prêt" }),
            downloadUrl && mxElement('a', {className: 'button secondary mx-download-again', href: downloadUrl, download: Oa + '.zip'}, mxElement(Wt, {size: 17}), 'Télécharger à nouveau le ZIP'),
            (0, y.jsxs)("p", {
              children: [
                "Extrayez le dossier ",
                (0, y.jsx)("strong", { children: Oa }),
                " de l’archive ZIP téléchargée, puis déposez-le dans la fenêtre de mise en ligne.",
              ],
            }),
            (0, y.jsxs)("a", {
              className: "button primary",
              href: vL + "/upload/main/publications",
              target: "_blank",
              rel: "noreferrer",
              children: [
                "Continuer la mise en ligne",
                (0, y.jsx)(Oe, { size: 17 }),
              ],
            }),
            (0, y.jsx)("p", {
              children:
                "Validez le dépôt pour lancer l’indexation et la publication de votre contenu.",
            }),
          ],
        }),
    ],
  });
}
